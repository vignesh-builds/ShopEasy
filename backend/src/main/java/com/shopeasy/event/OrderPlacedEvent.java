package com.shopeasy.event;

import com.shopeasy.mail.OrderMailData;

/** Published when a new order is saved. The confirmation mail goes out only after the transaction commits. */
public record OrderPlacedEvent(OrderMailData order) {
}
