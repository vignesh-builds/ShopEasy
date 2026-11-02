package com.shopeasy.service;

import com.shopeasy.dto.ProductReviewsResponse;
import com.shopeasy.dto.ReviewRequest;
import com.shopeasy.dto.ReviewResponse;
import com.shopeasy.entity.AppUser;
import com.shopeasy.entity.Product;
import com.shopeasy.entity.Review;
import com.shopeasy.exception.ApiException;
import com.shopeasy.repository.AppUserRepository;
import com.shopeasy.repository.OrderRepository;
import com.shopeasy.repository.ProductRepository;
import com.shopeasy.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReviewService {
    private static final int MAX_LISTED = 100;

    private final ReviewRepository reviews;
    private final ProductRepository products;
    private final AppUserRepository users;
    private final OrderRepository orders;

    public ReviewService(ReviewRepository reviews, ProductRepository products,
                         AppUserRepository users, OrderRepository orders) {
        this.reviews = reviews;
        this.products = products;
        this.users = users;
        this.orders = orders;
    }

    /** email may be null (guest): then myReview is always null. */
    @Transactional(readOnly = true)
    public ProductReviewsResponse list(Long productId, String email) {
        if (!products.existsById(productId)) throw ApiException.notFound("Product not found");
        Long userId = email == null ? null : users.findByEmailIgnoreCase(email).map(AppUser::getId).orElse(null);
        return build(productId, userId);
    }

    /** Creates the user's review, or edits it if they already reviewed this product. */
    @Transactional
    public ProductReviewsResponse save(Long productId, String email, ReviewRequest request) {
        Product product = products.findById(productId).orElseThrow(() -> ApiException.notFound("Product not found"));
        AppUser user = requireUser(email);
        Review review = reviews.findByProductIdAndUserId(productId, user.getId())
                .orElseGet(() -> new Review(productId, user.getId(), displayName(user.getFullName())));
        review.update(request.rating(), clean(request.title()), request.comment().trim());
        reviews.save(review);
        refreshRating(product);
        return build(productId, user.getId());
    }

    @Transactional
    public ProductReviewsResponse deleteMine(Long productId, String email) {
        Product product = products.findById(productId).orElseThrow(() -> ApiException.notFound("Product not found"));
        AppUser user = requireUser(email);
        Review review = reviews.findByProductIdAndUserId(productId, user.getId())
                .orElseThrow(() -> ApiException.notFound("You have not reviewed this product"));
        reviews.delete(review);
        reviews.flush();
        refreshRating(product);
        return build(productId, user.getId());
    }

    private AppUser requireUser(String email) {
        if (email == null) throw ApiException.unauthorized("Authentication required");
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
    }

    private ProductReviewsResponse build(Long productId, Long userId) {
        List<Review> all = reviews.findByProductIdOrderByCreatedAtDesc(productId);
        Set<Long> buyers = new HashSet<>(orders.buyerIds(productId));

        Map<Integer, Integer> breakdown = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) breakdown.put(star, 0);
        double sum = 0;
        for (Review r : all) {
            breakdown.merge(r.getRating(), 1, Integer::sum);
            sum += r.getRating();
        }
        double average = all.isEmpty() ? 0 : Math.round(sum / all.size() * 10.0) / 10.0;

        List<ReviewResponse> listed = all.stream().limit(MAX_LISTED)
                .map(r -> ReviewResponse.from(r, buyers.contains(r.getUserId()), r.getUserId().equals(userId)))
                .toList();
        ReviewResponse mine = all.stream().filter(r -> r.getUserId().equals(userId)).findFirst()
                .map(r -> ReviewResponse.from(r, buyers.contains(r.getUserId()), true))
                .orElse(null);
        return new ProductReviewsResponse(
                new ProductReviewsResponse.Summary(average, all.size(), breakdown), listed, mine);
    }

    /** Keeps products.rating / products.rating_count in line with the real reviews (used by the product cards). */
    private void refreshRating(Product product) {
        List<Review> all = reviews.findByProductIdOrderByCreatedAtDesc(product.getId());
        if (all.isEmpty()) {
            product.setRating(null);
            product.setRatingCount(null);
            return;
        }
        double avg = all.stream().mapToInt(Review::getRating).average().orElse(0);
        product.setRating(Math.round(avg * 10.0) / 10.0);
        product.setRatingCount(all.size());
    }

    private static String clean(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    /** "Priya Kumar" -> "Priya K."  (shows a name without exposing the whole thing). */
    private static String displayName(String fullName) {
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length < 2) return parts[0];
        return parts[0] + " " + Character.toUpperCase(parts[parts.length - 1].charAt(0)) + ".";
    }
}
