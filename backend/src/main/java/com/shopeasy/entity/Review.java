package com.shopeasy.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** One review per user per product (a second submit edits the first). */
@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "user_id"}))
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "product_id", nullable = false)
    private Long productId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(nullable = false, length = 100)
    private String userName;
    private int rating;
    @Column(length = 120)
    private String title;
    @Column(name = "review_text", nullable = false, length = 2000)   // "comment" is a keyword in some databases
    private String comment;
    private LocalDateTime createdAt = LocalDateTime.now();

    protected Review() {}

    public Review(Long productId, Long userId, String userName) {
        this.productId = productId; this.userId = userId; this.userName = userName;
    }

    /** Fill / edit the review text; an edited review moves to the top as "newest". */
    public void update(int rating, String title, String comment) {
        this.rating = rating; this.title = title; this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public int getRating() { return rating; }
    public String getTitle() { return title; }
    public String getComment() { return comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
