package com.shopeasy.repository;

import com.shopeasy.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByNameContainingIgnoreCase(String q);

    List<Product> findByCategoryIgnoreCase(String category);

    @Query("select distinct p.category from Product p order by p.category")
    List<String> findDistinctCategories();

    /** Row lock used at checkout so two simultaneous orders cannot oversell the same stock. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
