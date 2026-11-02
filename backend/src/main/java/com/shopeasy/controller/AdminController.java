package com.shopeasy.controller;

import com.shopeasy.dto.AdminSummaryResponse;
import com.shopeasy.dto.OrderResponse;
import com.shopeasy.dto.OrderStatusRequest;
import com.shopeasy.dto.OrderSummaryResponse;
import com.shopeasy.dto.ProductRequest;
import com.shopeasy.dto.ProductResponse;
import com.shopeasy.service.AdminService;
import com.shopeasy.service.OrderService;
import com.shopeasy.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Every route here requires the ADMIN role (enforced in SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final ProductService productService;
    private final OrderService orderService;

    public AdminController(AdminService adminService, ProductService productService, OrderService orderService) {
        this.adminService = adminService;
        this.productService = productService;
        this.orderService = orderService;
    }

    @GetMapping("/summary")
    public AdminSummaryResponse summary() {
        return adminService.summary();
    }

    @GetMapping("/orders")
    public List<OrderResponse> orders() {
        return orderService.recent();
    }

    /** Moves an order one step forward: PLACED -> SHIPPED -> DELIVERED. */
    @PutMapping("/orders/{id}/status")
    public OrderSummaryResponse updateOrderStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request) {
        return orderService.updateStatus(id, request.status());
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/products/{id}")
    public ProductResponse updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id) {
        productService.delete(id);
    }
}
