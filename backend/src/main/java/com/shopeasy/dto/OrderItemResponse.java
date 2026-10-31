package com.shopeasy.dto;

import com.shopeasy.entity.OrderItem;

public record OrderItemResponse(Long productId, String productName, double unitPrice, int quantity,
                                String size, String color) {

    public static OrderItemResponse from(OrderItem i) {
        return new OrderItemResponse(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(),
                i.getSize(), i.getColor());
    }
}
