package com.shopeasy.config;

import com.shopeasy.entity.AppUser;
import com.shopeasy.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminSeeder {

    /**
     * Makes sure the configured ADMIN account exists on startup.
     * If the email already exists (e.g. created earlier with another password, or registered as a normal USER),
     * it is promoted to ADMIN and, unless app.admin.reset-password-on-start=false, its password is reset
     * to the configured one.
     */
    @Bean
    CommandLineRunner seedAdmin(AppUserRepository users,
                                PasswordEncoder encoder,
                                @Value("${app.admin.email}") String email,
                                @Value("${app.admin.password}") String password,
                                @Value("${app.admin.reset-password-on-start:true}") boolean resetPassword) {
        return args -> {
            AppUser existing = users.findByEmailIgnoreCase(email.trim()).orElse(null);
            if (existing == null) {
                AppUser admin = new AppUser("ShopEasy Admin", email, encoder.encode(password), "ADMIN");
                admin.setEmailVerified(true);
                users.save(admin);
                return;
            }
            boolean changed = false;
            if (!"ADMIN".equals(existing.getRole())) {
                existing.setRole("ADMIN");
                changed = true;
            }
            if (resetPassword && !encoder.matches(password, existing.getPasswordHash())) {
                existing.setPasswordHash(encoder.encode(password));
                changed = true;
            }
            if (!existing.isEmailVerified()) {
                existing.setEmailVerified(true);
                changed = true;
            }
            if (changed) {
                users.save(existing);
            }
        };
    }
}
