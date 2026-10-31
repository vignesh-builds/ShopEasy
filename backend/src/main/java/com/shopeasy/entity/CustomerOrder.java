package com.shopeasy.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customer_orders")
public class CustomerOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String customerName;
    private String email;
    @Column(length = 1000)
    private String address;
    private double total;
    private String status = "PLACED";
    private Long userId;                 // set when a logged-in user placed the order (null = guest)
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime deliveredAt;       // set when the admin marks the order DELIVERED (starts the return window)
    private LocalDateTime cancelledAt;
    @Column(length = 500)
    private String cancelReason;
    private LocalDateTime returnRequestedAt;
    @Column(length = 500)
    private String returnReason;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    protected CustomerOrder() {}
    public CustomerOrder(String customerName, String email, String address, double total) {
        this.customerName = customerName; this.email = email; this.address = address; this.total = total;
    }
    public void addItem(OrderItem item) { items.add(item); item.setOrder(this); }
    public Long getId() { return id; }
    public String getCustomerName() { return customerName; }
    public String getEmail() { return email; }
    public String getAddress() { return address; }
    public double getTotal() { return total; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public String getCancelReason() { return cancelReason; }
    public void cancel(String reason) { this.status = "CANCELLED"; this.cancelledAt = LocalDateTime.now(); this.cancelReason = reason; }
    public LocalDateTime getReturnRequestedAt() { return returnRequestedAt; }
    public String getReturnReason() { return returnReason; }
    public void requestReturn(String reason) { this.status = "RETURN_REQUESTED"; this.returnRequestedAt = LocalDateTime.now(); this.returnReason = reason; }
}
