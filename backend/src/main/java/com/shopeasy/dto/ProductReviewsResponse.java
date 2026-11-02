package com.shopeasy.dto;

import java.util.List;
import java.util.Map;

/** Everything the product page needs: rating summary, the reviews, and the current user's own review (if any). */
public record ProductReviewsResponse(Summary summary, List<ReviewResponse> reviews, ReviewResponse myReview) {

    /** breakdown: star (5..1) -> number of reviews. */
    public record Summary(double average, int count, Map<Integer, Integer> breakdown) { }
}
