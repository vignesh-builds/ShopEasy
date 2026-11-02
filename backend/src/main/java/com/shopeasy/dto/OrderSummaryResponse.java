package com.shopeasy.dto;

import com.shopeasy.entity.CustomerOrder;

import java.time.LocalDateTime;

/** One row of the admin "Recent orders" list (no line items, no address). */
public record OrderSummaryResponse(Long id, String customerName, String email, double total,
                                   String status, LocalDateTime createdAt) {

    public static OrderSummaryResponse from(CustomerOrder o) {
        return new OrderSummaryResponse(o.getId(), o.getCustomerName(), o.getEmail(), o.getTotal(),
                o.getStatus(), o.getCreatedAt());
    }
}
