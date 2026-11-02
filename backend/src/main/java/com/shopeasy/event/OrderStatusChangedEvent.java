package com.shopeasy.event;

import com.shopeasy.mail.OrderMailData;

/** Published when an admin moves an order to SHIPPED or DELIVERED. */
public record OrderStatusChangedEvent(OrderMailData order) {
}
