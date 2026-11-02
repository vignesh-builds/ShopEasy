package com.shopeasy.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** One saved product for one logged-in user (guests keep their wishlist in the browser's localStorage). */
@Entity
@Table(name = "wishlist_items", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))
public class WishlistItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "product_id", nullable = false)
    private Long productId;
    private LocalDateTime createdAt = LocalDateTime.now();

    protected WishlistItem() {}

    public WishlistItem(Long userId, Long productId) {
        this.userId = userId;
        this.productId = productId;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getProductId() { return productId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
