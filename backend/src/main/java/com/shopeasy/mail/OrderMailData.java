package com.shopeasy.mail;

import com.shopeasy.entity.CustomerOrder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Plain snapshot of an order, taken inside the transaction. The mail is sent later (after commit, on another
 * thread), so it must not touch lazy JPA entities.
 */
public record OrderMailData(Long orderId, String customerName, String email, String address, double total,
                            String status, LocalDateTime createdAt, List<Line> items) {

    public record Line(String name, int quantity, double unitPrice, String size, String color) { }

    /** Call inside a transaction (items are lazy-loaded). */
    public static OrderMailData from(CustomerOrder o) {
        List<Line> lines = o.getItems().stream()
                .map(i -> new Line(i.getProductName(), i.getQuantity(), i.getUnitPrice(), i.getSize(), i.getColor()))
                .toList();
        return new OrderMailData(o.getId(), o.getCustomerName(), o.getEmail(), o.getAddress(), o.getTotal(),
                o.getStatus(), o.getCreatedAt(), lines);
    }
}
