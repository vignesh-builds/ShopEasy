package com.shopeasy.controller;

import com.shopeasy.dto.ProductReviewsResponse;
import com.shopeasy.dto.ReviewRequest;
import com.shopeasy.security.CurrentUser;
import com.shopeasy.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {
    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /** Public (GET /api/products/** is open). With a token, "myReview" / "mine" are filled in. */
    @GetMapping
    public ProductReviewsResponse list(@PathVariable Long productId, Authentication authentication) {
        return reviewService.list(productId, CurrentUser.email(authentication));
    }

    /** Needs login (SecurityConfig: anything not listed as public requires a JWT). Creates or edits. */
    @PostMapping
    public ProductReviewsResponse save(@PathVariable Long productId, @Valid @RequestBody ReviewRequest request,
                                       Authentication authentication) {
        return reviewService.save(productId, CurrentUser.email(authentication), request);
    }

    @DeleteMapping("/mine")
    public ProductReviewsResponse deleteMine(@PathVariable Long productId, Authentication authentication) {
        return reviewService.deleteMine(productId, CurrentUser.email(authentication));
    }
}
