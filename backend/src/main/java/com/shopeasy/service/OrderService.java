package com.shopeasy.service;

import com.shopeasy.dto.OrderRequest;
import com.shopeasy.dto.ProductResponse;
import com.shopeasy.dto.OrderResponse;
import com.shopeasy.dto.OrderSummaryResponse;
import com.shopeasy.entity.AppUser;
import com.shopeasy.entity.CustomerOrder;
import com.shopeasy.event.OrderPlacedEvent;
import com.shopeasy.event.OrderStatusChangedEvent;
import com.shopeasy.entity.OrderItem;
import com.shopeasy.entity.Product;
import com.shopeasy.exception.ApiException;
import com.shopeasy.repository.AppUserRepository;
import com.shopeasy.repository.OrderRepository;
import com.shopeasy.mail.OrderMailData;
import com.shopeasy.repository.ProductRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

@Service
public class OrderService {
    private final OrderRepository orders;
    private final ProductRepository products;
    private final AppUserRepository users;
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository orders, ProductRepository products, AppUserRepository users,
                        ApplicationEventPublisher events) {
        this.orders = orders;
        this.products = products;
        this.users = users;
        this.events = events;
    }

    /** email = the logged-in user's email, or null for a guest checkout. */
    @Transactional
    public OrderResponse create(OrderRequest request, String email) {
        // Total quantity per product (all sizes/colors together) - stock is tracked per product.
        // TreeMap => products are always locked in the same (id) order, avoiding deadlocks.
        Map<Long, Integer> quantities = new TreeMap<>();
        for (OrderRequest.Item item : request.items()) {
            quantities.merge(item.productId(), item.quantity(), Integer::sum);
        }

        // Pass 1: lock + validate everything BEFORE changing any stock.
        Map<Long, Product> selected = new LinkedHashMap<>();
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            Product product = products.findByIdForUpdate(entry.getKey())
                    .orElseThrow(() -> ApiException.badRequest("Unknown product id: " + entry.getKey()));
            if (entry.getValue() > product.getStock()) {
                throw ApiException.badRequest("Not enough stock for " + product.getName());
            }
            selected.put(product.getId(), product);
        }

        // Pass 2: validate size / color choices, build one order line per product+size+color, reduce stock.
        double total = 0;
        List<OrderItem> lines = new ArrayList<>();
        for (OrderRequest.Item item : request.items()) {
            Product product = selected.get(item.productId());
            String size = choose(product, "size", item.size(), ProductResponse.from(product).sizes());
            String color = choose(product, "color", item.color(),
                    ProductResponse.from(product).colors().stream().map(ProductResponse.Color::name).toList());
            total += product.getPrice() * item.quantity();
            lines.add(new OrderItem(product.getId(), product.getName(), product.getPrice(), item.quantity(), size, color));
        }

        CustomerOrder order = new CustomerOrder(request.customerName().trim(), request.email().trim(),
                request.address().trim(), Math.round(total * 100.0) / 100.0);
        if (email != null) {
            users.findByEmailIgnoreCase(email).map(AppUser::getId).ifPresent(order::setUserId);
        }
        lines.forEach(order::addItem);
        quantities.forEach((id, qty) -> {
            Product product = selected.get(id);
            product.setStock(product.getStock() - qty);
        });
        CustomerOrder saved = orders.save(order);
        // The confirmation mail is sent after this transaction commits (see OrderMailListener).
        events.publishEvent(new OrderPlacedEvent(OrderMailData.from(saved)));
        return OrderResponse.from(saved);
    }

    /** A product that offers sizes/colors needs a valid choice; one that does not offer them ignores it. */
    private static String choose(Product product, String what, String picked, List<String> options) {
        if (options.isEmpty()) return null;
        if (picked == null || picked.isBlank()) {
            throw ApiException.badRequest("Please choose a " + what + " for " + product.getName());
        }
        return options.stream().filter(o -> o.equalsIgnoreCase(picked.trim())).findFirst()
                .orElseThrow(() -> ApiException.badRequest(
                        "Invalid " + what + " '" + picked + "' for " + product.getName()));
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        CustomerOrder order = orders.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        return OrderResponse.from(order);
    }

    /** Admin list: the 50 newest orders, plus every order with an open return (even an old one) so none is missed. */
    @Transactional(readOnly = true)
    public List<OrderResponse> recent() {
        Map<Long, CustomerOrder> merged = new LinkedHashMap<>();
        orders.findTop50ByOrderByCreatedAtDesc().forEach(o -> merged.put(o.getId(), o));
        orders.findByStatusInOrderByCreatedAtDesc(List.of("RETURN_REQUESTED", "RETURN_APPROVED"))
                .forEach(o -> merged.putIfAbsent(o.getId(), o));
        return merged.values().stream()
                .sorted(Comparator.comparing(CustomerOrder::getCreatedAt).reversed())
                .map(OrderResponse::from).toList();
    }

    /** "My orders": newest first, only orders placed while logged in as this user. */
    @Transactional(readOnly = true)
    public List<OrderResponse> forUser(String email) {
        if (email == null) throw ApiException.unauthorized("Authentication required");
        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
        return orders.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(OrderResponse::from).toList();
    }

    /** Returns are accepted for this many days after the order was marked delivered. */
    public static final int RETURN_WINDOW_DAYS = 7;

    /** Admin: PLACED -> SHIPPED -> DELIVERED, and for returns RETURN_REQUESTED -> RETURN_APPROVED / RETURN_REJECTED -> REFUNDED. */
    @Transactional
    public OrderSummaryResponse updateStatus(Long id, String status) {
        CustomerOrder order = orders.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        String next = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        String current = order.getStatus();
        boolean allowed = ("PLACED".equals(current) && "SHIPPED".equals(next))
                || ("SHIPPED".equals(current) && "DELIVERED".equals(next))
                || ("RETURN_REQUESTED".equals(current) && ("RETURN_APPROVED".equals(next) || "RETURN_REJECTED".equals(next)))
                || ("RETURN_APPROVED".equals(current) && "REFUNDED".equals(next));
        if (!allowed) {
            throw ApiException.badRequest("Cannot change order status from " + current + " to " + next);
        }
        order.setStatus(next);
        if ("DELIVERED".equals(next)) order.setDeliveredAt(LocalDateTime.now());
        if ("REFUNDED".equals(next)) restock(order);          // returned goods go back on the shelf
        events.publishEvent(new OrderStatusChangedEvent(OrderMailData.from(order)));
        return OrderSummaryResponse.from(order);
    }

    /** Customer cancels their own order - only while it has not shipped yet (status PLACED = pending / processing). */
    @Transactional
    public OrderResponse cancel(Long id, String email, String reason) {
        CustomerOrder order = ownedOrder(id, email);
        if (!"PLACED".equals(order.getStatus())) {
            throw ApiException.badRequest("This order can no longer be cancelled because it is " + readable(order.getStatus()) + ".");
        }
        order.cancel(reason.trim());
        restock(order);
        events.publishEvent(new OrderStatusChangedEvent(OrderMailData.from(order)));
        return OrderResponse.from(order);
    }

    /** Customer raises a return request for a delivered order, within RETURN_WINDOW_DAYS of delivery. */
    @Transactional
    public OrderResponse requestReturn(Long id, String email, String reason) {
        CustomerOrder order = ownedOrder(id, email);
        if (!"DELIVERED".equals(order.getStatus())) {
            throw ApiException.badRequest("Only delivered orders can be returned.");
        }
        LocalDateTime since = order.getDeliveredAt() != null ? order.getDeliveredAt() : order.getCreatedAt();
        if (since.plusDays(RETURN_WINDOW_DAYS).isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("The " + RETURN_WINDOW_DAYS + "-day return window for this order has closed.");
        }
        order.requestReturn(reason.trim());
        events.publishEvent(new OrderStatusChangedEvent(OrderMailData.from(order)));
        return OrderResponse.from(order);
    }

    private CustomerOrder ownedOrder(Long id, String email) {
        if (email == null) throw ApiException.unauthorized("Authentication required");
        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
        CustomerOrder order = orders.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        // Someone else's order looks exactly like a missing one.
        if (order.getUserId() == null || !order.getUserId().equals(user.getId())) {
            throw ApiException.notFound("Order not found");
        }
        return order;
    }

    /** Puts the quantities of an order back into stock (products locked in id order, like checkout). */
    private void restock(CustomerOrder order) {
        Map<Long, Integer> quantities = new TreeMap<>();
        order.getItems().forEach(i -> quantities.merge(i.getProductId(), i.getQuantity(), Integer::sum));
        quantities.forEach((productId, qty) ->
                products.findByIdForUpdate(productId).ifPresent(p -> p.setStock(p.getStock() + qty)));
    }

    private static String readable(String status) {
        return status.toLowerCase(Locale.ROOT).replace('_', ' ');
    }
}
