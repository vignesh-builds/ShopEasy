package com.shopeasy.service;

import com.shopeasy.dto.AdminSummaryResponse;
import com.shopeasy.repository.AppUserRepository;
import com.shopeasy.repository.OrderRepository;
import com.shopeasy.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
    private final ProductRepository products;
    private final OrderRepository orders;
    private final AppUserRepository users;

    public AdminService(ProductRepository products, OrderRepository orders, AppUserRepository users) {
        this.products = products;
        this.orders = orders;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public AdminSummaryResponse summary() {
        return new AdminSummaryResponse(products.count(), orders.count(), users.count(), orders.totalRevenue(),
                orders.countByStatus("RETURN_REQUESTED"));
    }
}
