package com.shopeasy.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long productId;
    private String productName;
    private double unitPrice;
    private int quantity;
    private String size;
    private String color;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private CustomerOrder order;

    protected OrderItem() {}
    public OrderItem(Long productId, String productName, double unitPrice, int quantity) {
        this.productId = productId; this.productName = productName; this.unitPrice = unitPrice; this.quantity = quantity;
    }
    public OrderItem(Long productId, String productName, double unitPrice, int quantity, String size, String color) {
        this(productId, productName, unitPrice, quantity);
        this.size = size; this.color = color;
    }
    public void setOrder(CustomerOrder order) { this.order = order; }
    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public double getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public String getSize() { return size; }
    public String getColor() { return color; }
}
