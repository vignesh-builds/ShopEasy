package com.shopeasy.controller;

import com.shopeasy.dto.ProductResponse;
import com.shopeasy.dto.RecommendationsResponse;
import com.shopeasy.service.ProductService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    public List<ProductResponse> list(@RequestParam(required = false) String q,
                                      @RequestParam(required = false) String category) {
        return productService.search(q, category);
    }

    @GetMapping("/products/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return productService.get(id);
    }

    /** Product page: "Customers also bought" + "You may also like". Public, like the rest of the catalogue. */
    @GetMapping("/products/{id}/recommendations")
    public RecommendationsResponse recommendations(@PathVariable Long id) {
        return productService.recommendations(id);
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return productService.categories();
    }
}
