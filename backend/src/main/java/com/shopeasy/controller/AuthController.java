package com.shopeasy.controller;

import com.shopeasy.dto.AuthResponse;
import com.shopeasy.dto.EmailRequest;
import com.shopeasy.dto.LoginRequest;
import com.shopeasy.dto.MessageResponse;
import com.shopeasy.dto.RegisterRequest;
import com.shopeasy.dto.ResetPasswordRequest;
import com.shopeasy.dto.TokenRequest;
import com.shopeasy.dto.UserResponse;
import com.shopeasy.exception.ApiException;
import com.shopeasy.security.CurrentUser;
import com.shopeasy.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Requires a valid JWT (see SecurityConfig). */
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        return authService.me(authentication.getName());
    }

    /** Public: the link in the verification mail lands on the React page, which calls this. */
    @PostMapping("/verify-email")
    public MessageResponse verifyEmail(@Valid @RequestBody TokenRequest request) {
        return authService.verifyEmail(request.token());
    }

    /** Logged-in user: send the verification mail again. */
    @PostMapping("/resend-verification")
    public MessageResponse resendVerification(Authentication authentication) {
        return authService.resendVerification(CurrentUser.email(authentication));
    }

    /** Public: always the same answer, whether or not the email is registered. */
    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody EmailRequest request) {
        return authService.forgotPassword(request.email());
    }

    /** Public: the token from the reset mail + the new password. */
    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request.token(), request.password());
    }
}
