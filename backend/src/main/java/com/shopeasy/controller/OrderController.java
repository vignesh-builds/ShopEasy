package com.shopeasy.controller;

import com.shopeasy.dto.OrderRequest;
import com.shopeasy.dto.OrderResponse;
import com.shopeasy.dto.ReasonRequest;
import com.shopeasy.security.CurrentUser;
import com.shopeasy.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /** Public demo checkout. If the request carries a valid token the order is linked to that user ("My orders"). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody OrderRequest request, Authentication authentication) {
        return orderService.create(request, CurrentUser.email(authentication));
    }

    /** Any logged-in user: their own orders, newest first (see SecurityConfig). */
    @GetMapping("/mine")
    public List<OrderResponse> mine(Authentication authentication) {
        return orderService.forUser(CurrentUser.email(authentication));
    }

    /** Logged-in owner: cancel an order that has not shipped yet. */
    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@PathVariable Long id, @Valid @RequestBody ReasonRequest request, Authentication authentication) {
        return orderService.cancel(id, CurrentUser.email(authentication), request.reason());
    }

    /** Logged-in owner: raise a return request for a delivered order (inside the return window). */
    @PostMapping("/{id}/return")
    public OrderResponse requestReturn(@PathVariable Long id, @Valid @RequestBody ReasonRequest request, Authentication authentication) {
        return orderService.requestReturn(id, CurrentUser.email(authentication), request.reason());
    }

    /** ADMIN only (see SecurityConfig). */
    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return orderService.get(id);
    }
}
