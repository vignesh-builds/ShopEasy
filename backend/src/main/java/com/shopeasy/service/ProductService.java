package com.shopeasy.service;

import com.shopeasy.dto.ProductRequest;
import com.shopeasy.dto.ProductResponse;
import com.shopeasy.dto.RecommendationsResponse;
import com.shopeasy.entity.Product;
import com.shopeasy.exception.ApiException;
import com.shopeasy.repository.OrderRepository;
import com.shopeasy.repository.ProductRepository;
import com.shopeasy.repository.ReviewRepository;
import com.shopeasy.repository.WishlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductService {
    private final ProductRepository products;
    private final ReviewRepository reviews;
    private final WishlistRepository wishlist;
    private final OrderRepository orders;

    public ProductService(ProductRepository products, ReviewRepository reviews, WishlistRepository wishlist,
                          OrderRepository orders) {
        this.products = products;
        this.reviews = reviews;
        this.wishlist = wishlist;
        this.orders = orders;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String q, String category) {
        boolean hasQuery = q != null && !q.isBlank();
        boolean hasCategory = category != null && !category.isBlank();

        List<Product> result;
        if (hasCategory) {
            result = products.findByCategoryIgnoreCase(category);
        } else if (hasQuery) {
            result = products.findByNameContainingIgnoreCase(q);
        } else {
            result = products.findAll();
        }
        if (hasQuery && hasCategory) {
            String query = q.toLowerCase(Locale.ROOT);
            result = result.stream().filter(p -> p.getName().toLowerCase(Locale.ROOT).contains(query)).toList();
        }
        return result.stream().map(ProductResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.from(find(id));
    }

    private static final int ALSO_BOUGHT_LIMIT = 4;
    private static final int SIMILAR_LIMIT = 8;

    /**
     * Suggestions for the product page.
     * 1) alsoBought: products that appear in the same orders as this one (most shared orders first).
     * 2) similar: every other in-stock product ranked by a simple score - same category, same brand,
     *    close price, good rating. Because all categories are candidates, the list is still full when
     *    a category has only one product.
     */
    @Transactional(readOnly = true)
    public RecommendationsResponse recommendations(Long id) {
        Product base = find(id);

        // ---- customers also bought ----
        List<Object[]> rows = orders.boughtTogether(id);
        List<Long> boughtIds = rows.stream()
                .sorted((a, b) -> Long.compare(((Number) b[1]).longValue(), ((Number) a[1]).longValue()))
                .map(r -> ((Number) r[0]).longValue())
                .toList();
        Map<Long, Product> byId = products.findAllById(boughtIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        List<Product> alsoBought = new ArrayList<>();
        for (Long otherId : boughtIds) {
            Product other = byId.get(otherId);
            if (other != null && other.getStock() > 0) alsoBought.add(other);
            if (alsoBought.size() == ALSO_BOUGHT_LIMIT) break;
        }

        // ---- similar / you may also like ----
        Set<Long> skip = new HashSet<>();
        skip.add(id);
        alsoBought.forEach(p -> skip.add(p.getId()));
        List<Product> candidates = products.findAll().stream()
                .filter(p -> !skip.contains(p.getId()) && p.getStock() > 0)
                .sorted(Comparator.comparingDouble((Product p) -> -score(base, p)).thenComparing(Product::getId))
                .limit(SIMILAR_LIMIT)
                .toList();

        return new RecommendationsResponse(
                alsoBought.stream().map(ProductResponse::from).toList(),
                candidates.stream().map(ProductResponse::from).toList());
    }

    private static double score(Product base, Product other) {
        double score = 0;
        if (base.getCategory() != null && base.getCategory().equalsIgnoreCase(other.getCategory())) score += 50;
        if (base.getBrand() != null && base.getBrand().equalsIgnoreCase(other.getBrand())) score += 20;
        double reference = Math.max(base.getPrice(), 1);
        double closeness = 1 - Math.min(1, Math.abs(base.getPrice() - other.getPrice()) / reference);
        score += 20 * closeness;
        if (other.getRating() != null) score += other.getRating() * 2;     // 0 - 10 points
        return score;
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return products.findDistinctCategories();
    }

    @Transactional
    public ProductResponse create(ProductRequest r) {
        Product product = new Product(r.name().trim(), r.description().trim(), r.category().trim(),
                r.price(), r.imageUrl().trim(), r.stock());
        applyOptionalFields(product, r);
        return ProductResponse.from(products.save(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest r) {
        Product product = find(id);
        product.setName(r.name().trim());
        product.setDescription(r.description().trim());
        product.setCategory(r.category().trim());
        product.setPrice(r.price());
        product.setImageUrl(r.imageUrl().trim());
        product.setStock(r.stock());
        applyOptionalFields(product, r);
        return ProductResponse.from(products.save(product));
    }

    private static void applyOptionalFields(Product product, ProductRequest r) {
        product.setBrand(blankToNull(r.brand()));
        product.setMrp(r.mrp() == null || r.mrp() <= 0 ? null : r.mrp());
        product.setImages(blankToNull(r.images()));
        product.setColors(blankToNull(r.colors()));
        product.setSizes(blankToNull(r.sizes()));
        product.setHighlights(blankToNull(r.highlights()));
        product.setSpecifications(blankToNull(r.specifications()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    @Transactional
    public void delete(Long id) {
        if (!products.existsById(id)) {
            throw ApiException.notFound("Product not found");
        }
        reviews.deleteByProductId(id);
        wishlist.deleteByProductId(id);
        products.deleteById(id);
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product not found"));
    }
}
