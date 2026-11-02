package com.shopeasy.dto;

import com.shopeasy.entity.AppUser;

public record UserResponse(Long id, String fullName, String email, String role, boolean emailVerified) {

    public static UserResponse from(AppUser u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isEmailVerified());
    }
}
