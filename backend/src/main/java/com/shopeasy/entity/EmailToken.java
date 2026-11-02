package com.shopeasy.entity;

import jakarta.persistence.*;

import java.time.Instant;

/** One-time token for "verify your email" and "reset your password". Only a SHA-256 hash is stored. */
@Entity
@Table(name = "email_tokens")
public class EmailToken {
    public static final String VERIFY_EMAIL = "VERIFY_EMAIL";
    public static final String RESET_PASSWORD = "RESET_PASSWORD";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long userId;
    @Column(nullable = false, length = 64, unique = true)
    private String tokenHash;
    @Column(nullable = false, length = 20)
    private String type;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant expiresAt;
    private Instant usedAt;

    protected EmailToken() {}

    public EmailToken(Long userId, String tokenHash, String type, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.type = type;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public String getType() { return type; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public void setUsedAt(Instant usedAt) { this.usedAt = usedAt; }

    public boolean isUsable(Instant now) {
        return usedAt == null && expiresAt.isAfter(now);
    }
}
