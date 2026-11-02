package com.shopeasy.dto;

import com.shopeasy.entity.Review;

import java.time.LocalDateTime;

public record ReviewResponse(Long id, String userName, int rating, String title, String comment,
                             LocalDateTime createdAt, boolean verifiedPurchase, boolean mine) {

    public static ReviewResponse from(Review r, boolean verifiedPurchase, boolean mine) {
        return new ReviewResponse(r.getId(), r.getUserName(), r.getRating(), r.getTitle(), r.getComment(),
                r.getCreatedAt(), verifiedPurchase, mine);
    }
}
