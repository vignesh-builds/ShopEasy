package com.shopeasy.mail;

import com.shopeasy.event.OrderPlacedEvent;
import com.shopeasy.event.OrderStatusChangedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends order mails only after the order / status change is safely committed to the database. */
@Component
public class OrderMailListener {
    private final EmailService emails;

    public OrderMailListener(EmailService emails) {
        this.emails = emails;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onOrderPlaced(OrderPlacedEvent event) {
        emails.sendOrderPlaced(event.order());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onStatusChanged(OrderStatusChangedEvent event) {
        String status = event.order().status();
        switch (status) {
            case "SHIPPED" -> emails.sendOrderShipped(event.order());
            case "DELIVERED" -> emails.sendOrderDelivered(event.order());
            case "CANCELLED", "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "REFUNDED" ->
                    emails.sendOrderUpdate(event.order());
            default -> { }
        }
    }
}
