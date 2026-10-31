package com.shopeasy.dto;

import com.shopeasy.entity.CustomerOrder;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(Long id, String customerName, String email, String address, double total,
                            String status, LocalDateTime createdAt, List<OrderItemResponse> items,
                            LocalDateTime deliveredAt, String cancelReason,
                            LocalDateTime returnRequestedAt, String returnReason) {

    /** Must be called inside a transaction (items are lazy-loaded). */
    public static OrderResponse from(CustomerOrder o) {
        return new OrderResponse(o.getId(), o.getCustomerName(), o.getEmail(), o.getAddress(), o.getTotal(),
                o.getStatus(), o.getCreatedAt(), o.getItems().stream().map(OrderItemResponse::from).toList(),
                o.getDeliveredAt(), o.getCancelReason(), o.getReturnRequestedAt(), o.getReturnReason());
    }
}
