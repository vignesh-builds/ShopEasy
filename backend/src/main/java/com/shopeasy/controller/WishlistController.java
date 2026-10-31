package com.shopeasy.controller;

import com.shopeasy.dto.WishlistMergeRequest;
import com.shopeasy.security.CurrentUser;
import com.shopeasy.service.WishlistService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Logged-in users only (SecurityConfig: anything not listed as public needs a JWT). Guests use localStorage. */
@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {
    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public List<Long> list(Authentication authentication) {
        return wishlistService.list(CurrentUser.email(authentication));
    }

    @PutMapping("/{productId}")
    public List<Long> add(@PathVariable Long productId, Authentication authentication) {
        return wishlistService.add(CurrentUser.email(authentication), productId);
    }

    @DeleteMapping("/{productId}")
    public List<Long> remove(@PathVariable Long productId, Authentication authentication) {
        return wishlistService.remove(CurrentUser.email(authentication), productId);
    }

    @PostMapping("/merge")
    public List<Long> merge(@Valid @RequestBody WishlistMergeRequest request, Authentication authentication) {
        return wishlistService.merge(CurrentUser.email(authentication), request.productIds());
    }
}
