package com.shopeasy.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

/** Small helper: the logged-in user's email, or null for guests (public endpoints receive an anonymous token). */
public final class CurrentUser {
    private CurrentUser() {}

    public static String email(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }
}
