package com.shopeasy.service;

import com.shopeasy.dto.AuthResponse;
import com.shopeasy.dto.LoginRequest;
import com.shopeasy.dto.MessageResponse;
import com.shopeasy.dto.RegisterRequest;
import com.shopeasy.dto.UserResponse;
import com.shopeasy.entity.AppUser;
import com.shopeasy.entity.EmailToken;
import com.shopeasy.exception.ApiException;
import com.shopeasy.mail.EmailService;
import com.shopeasy.repository.AppUserRepository;
import com.shopeasy.repository.EmailTokenRepository;
import com.shopeasy.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class AuthService {
    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofMinutes(30);
    /** Minimum gap between two mails of the same kind to the same account (stops mail flooding). */
    static final Duration COOLDOWN = Duration.ofSeconds(60);

    static final String INVALID_LINK = "This link is invalid or has expired. Please request a new one.";
    static final String FORGOT_MESSAGE = "If an account exists for that email, we have sent a password reset link.";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailTokenRepository tokens;
    private final EmailService emails;

    public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtService jwt,
                       EmailTokenRepository tokens, EmailService emails) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.tokens = tokens;
        this.emails = emails;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email is already registered");
        }
        AppUser user = users.save(new AppUser(request.fullName().trim(), email,
                encoder.encode(request.password()), "USER"));
        sendVerification(user);
        return authResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        AppUser user = users.findByEmailIgnoreCase(request.email().trim()).orElse(null);
        if (user == null || !encoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return authResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return users.findByEmailIgnoreCase(email)
                .map(UserResponse::from)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    /* ------------------------------------------------------------------ email verification */

    /** Logged-in user asks for a fresh verification mail. */
    @Transactional
    public MessageResponse resendVerification(String email) {
        AppUser user = users.findByEmailIgnoreCase(email == null ? "" : email)
                .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
        if (user.isEmailVerified()) {
            return new MessageResponse("Your email is already verified.");
        }
        if (inCooldown(user.getId(), EmailToken.VERIFY_EMAIL)) {
            throw ApiException.tooManyRequests("A verification email was sent a moment ago. Please wait a minute and try again.");
        }
        sendVerification(user);
        return new MessageResponse("Verification email sent. Please check your inbox.");
    }

    /** Public: the link in the mail calls this. Safe to call twice (second call just confirms). */
    @Transactional
    public MessageResponse verifyEmail(String rawToken) {
        EmailToken token = tokens.findByTokenHashAndType(hash(rawToken), EmailToken.VERIFY_EMAIL)
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK));
        AppUser user = users.findById(token.getUserId()).orElseThrow(() -> ApiException.badRequest(INVALID_LINK));

        if (token.getUsedAt() != null) {
            if (user.isEmailVerified()) {
                return new MessageResponse("Your email is already verified.");
            }
            throw ApiException.badRequest(INVALID_LINK);
        }
        if (!token.isUsable(Instant.now())) {
            throw ApiException.badRequest(INVALID_LINK);
        }
        token.setUsedAt(Instant.now());
        user.setEmailVerified(true);
        users.save(user);
        return new MessageResponse("Your email is verified. Thank you!");
    }

    /* ------------------------------------------------------------------ forgot / reset password */

    /** Always answers the same way, so nobody can use this to find out which emails are registered. */
    @Transactional
    public MessageResponse forgotPassword(String email) {
        tokens.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(7)));
        AppUser user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user != null && !inCooldown(user.getId(), EmailToken.RESET_PASSWORD)) {
            String raw = newRawToken();
            tokens.save(new EmailToken(user.getId(), hash(raw), EmailToken.RESET_PASSWORD, Instant.now().plus(RESET_TTL)));
            emails.sendPasswordResetEmail(user.getFullName(), user.getEmail(), raw);
        }
        return new MessageResponse(FORGOT_MESSAGE);
    }

    @Transactional
    public MessageResponse resetPassword(String rawToken, String newPassword) {
        EmailToken token = tokens.findByTokenHashAndType(hash(rawToken), EmailToken.RESET_PASSWORD)
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK));
        if (!token.isUsable(Instant.now())) {
            throw ApiException.badRequest(INVALID_LINK);
        }
        AppUser user = users.findById(token.getUserId()).orElseThrow(() -> ApiException.badRequest(INVALID_LINK));

        user.setPasswordHash(encoder.encode(newPassword));
        user.setEmailVerified(true);            // they just proved they own this mailbox
        users.save(user);

        Instant now = Instant.now();
        token.setUsedAt(now);
        // any other reset link that is still open for this account is now dead as well
        tokens.findByUserIdAndTypeAndUsedAtIsNull(user.getId(), EmailToken.RESET_PASSWORD)
                .forEach(t -> t.setUsedAt(now));
        return new MessageResponse("Your password has been changed. You can log in now.");
    }

    /* ------------------------------------------------------------------ helpers */

    private void sendVerification(AppUser user) {
        // a new link replaces older ones
        Instant now = Instant.now();
        tokens.findByUserIdAndTypeAndUsedAtIsNull(user.getId(), EmailToken.VERIFY_EMAIL).forEach(t -> t.setUsedAt(now));
        String raw = newRawToken();
        tokens.save(new EmailToken(user.getId(), hash(raw), EmailToken.VERIFY_EMAIL, now.plus(VERIFY_TTL)));
        emails.sendVerificationEmail(user.getFullName(), user.getEmail(), raw);
    }

    private boolean inCooldown(Long userId, String type) {
        return tokens.findFirstByUserIdAndTypeOrderByCreatedAtDesc(userId, type)
                .map(t -> t.getCreatedAt().plus(COOLDOWN).isAfter(Instant.now()))
                .orElse(false);
    }

    private static String newRawToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private AuthResponse authResponse(AppUser user) {
        return new AuthResponse(jwt.generate(user.getEmail(), user.getRole()), UserResponse.from(user));
    }
}
