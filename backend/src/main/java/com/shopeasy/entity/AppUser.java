package com.shopeasy.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 190)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    @Column(nullable = false, length = 100)
    private String fullName;
    @Column(nullable = false, length = 20)
    private String role = "USER";
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    // columnDefinition gives existing rows a default, so ddl-auto=update can add this column to a populated table
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean emailVerified = false;

    protected AppUser() {
    }

    public AppUser(String fullName, String email, String passwordHash, String role) {
        this.fullName = fullName;
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setRole(String role) { this.role = role; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
}
