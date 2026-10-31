package com.shopeasy.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(length = 1200)
    private String description;
    private String category;
    private double price;
    private String imageUrl;
    private int stock;

    // ---- detail-page fields (all optional; wrapper types so old rows with NULL still load) ----
    private String brand;
    private Double mrp;                 // original price, used to show the discount %
    private Double rating;              // 0 - 5
    private Integer ratingCount;
    @Column(length = 2000)
    private String images;              // extra gallery images, separated by |
    @Column(length = 500)
    private String colors;              // Name:#hex|Name:#hex   e.g. Black:#111111|Navy:#1f2a44
    @Column(length = 500)
    private String sizes;               // 6|7|8|9   or   S|M|L|XL
    @Column(length = 2000)
    private String highlights;          // bullet points, separated by |
    @Column(length = 2000)
    private String specifications;      // Key:Value|Key:Value

    protected Product() {}

    public Product(String name, String description, String category, double price, String imageUrl, int stock) {
        this.name = name; this.description = description; this.category = category;
        this.price = price; this.imageUrl = imageUrl; this.stock = stock;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public double getPrice() { return price; }
    public String getImageUrl() { return imageUrl; }
    public int getStock() { return stock; }
    public String getBrand() { return brand; }
    public Double getMrp() { return mrp; }
    public Double getRating() { return rating; }
    public Integer getRatingCount() { return ratingCount; }
    public String getImages() { return images; }
    public String getColors() { return colors; }
    public String getSizes() { return sizes; }
    public String getHighlights() { return highlights; }
    public String getSpecifications() { return specifications; }

    public void setStock(int stock) { this.stock = stock; }
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setPrice(double price) { this.price = price; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setBrand(String brand) { this.brand = brand; }
    public void setMrp(Double mrp) { this.mrp = mrp; }
    public void setRating(Double rating) { this.rating = rating; }
    public void setRatingCount(Integer ratingCount) { this.ratingCount = ratingCount; }
    public void setImages(String images) { this.images = images; }
    public void setColors(String colors) { this.colors = colors; }
    public void setSizes(String sizes) { this.sizes = sizes; }
    public void setHighlights(String highlights) { this.highlights = highlights; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }
}
