package com.shopeasy.service;

import com.shopeasy.entity.AppUser;
import com.shopeasy.entity.WishlistItem;
import com.shopeasy.exception.ApiException;
import com.shopeasy.repository.AppUserRepository;
import com.shopeasy.repository.ProductRepository;
import com.shopeasy.repository.WishlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Every method returns the user's wishlist as product ids, newest first (the app uses it to colour the hearts). */
@Service
public class WishlistService {
    private final WishlistRepository wishlist;
    private final ProductRepository products;
    private final AppUserRepository users;

    public WishlistService(WishlistRepository wishlist, ProductRepository products, AppUserRepository users) {
        this.wishlist = wishlist;
        this.products = products;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<Long> list(String email) {
        return ids(requireUser(email).getId());
    }

    /** Adding something that is already saved is fine (no error, no duplicate). */
    @Transactional
    public List<Long> add(String email, Long productId) {
        AppUser user = requireUser(email);
        if (!products.existsById(productId)) throw ApiException.notFound("Product not found");
        if (wishlist.findByUserIdAndProductId(user.getId(), productId).isEmpty()) {
            wishlist.save(new WishlistItem(user.getId(), productId));
            wishlist.flush();
        }
        return ids(user.getId());
    }

    @Transactional
    public List<Long> remove(String email, Long productId) {
        AppUser user = requireUser(email);
        wishlist.findByUserIdAndProductId(user.getId(), productId).ifPresent(wishlist::delete);
        wishlist.flush();
        return ids(user.getId());
    }

    /** Guest items -> account. Unknown / already saved ids are skipped silently. */
    @Transactional
    public List<Long> merge(String email, List<Long> productIds) {
        AppUser user = requireUser(email);
        Set<Long> saved = new HashSet<>(ids(user.getId()));
        for (Long productId : productIds) {
            if (productId == null || saved.contains(productId) || !products.existsById(productId)) continue;
            wishlist.save(new WishlistItem(user.getId(), productId));
            saved.add(productId);
        }
        wishlist.flush();
        return ids(user.getId());
    }

    private List<Long> ids(Long userId) {
        return wishlist.findByUserIdOrderByCreatedAtDescIdDesc(userId).stream().map(WishlistItem::getProductId).toList();
    }

    private AppUser requireUser(String email) {
        if (email == null) throw ApiException.unauthorized("Authentication required");
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
    }
}
