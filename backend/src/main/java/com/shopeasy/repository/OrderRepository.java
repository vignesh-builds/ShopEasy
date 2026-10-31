package com.shopeasy.repository;

import com.shopeasy.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findTop50ByOrderByCreatedAtDesc();

    List<CustomerOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByStatus(String status);

    List<CustomerOrder> findByStatusInOrderByCreatedAtDesc(Collection<String> statuses);

    @Query("select coalesce(sum(o.total), 0.0) from CustomerOrder o where o.status not in ('CANCELLED', 'REFUNDED')")
    double totalRevenue();

    /** Ids of logged-in users who bought this product (for the "Verified purchase" badge on reviews). */
    @Query("select distinct o.userId from CustomerOrder o join o.items i "
            + "where i.productId = :productId and o.userId is not null and o.status not in ('CANCELLED', 'REFUNDED')")
    List<Long> buyerIds(@Param("productId") Long productId);

    /**
     * "Customers also bought": for every order that contains {@code productId}, the other products in that order,
     * as rows of [otherProductId, numberOfOrdersTheyShared]. Not sorted - the service sorts them.
     */
    @Query("select i2.productId, count(distinct o.id) from CustomerOrder o join o.items i1 join o.items i2 "
            + "where i1.productId = :productId and i2.productId <> :productId group by i2.productId")
    List<Object[]> boughtTogether(@Param("productId") Long productId);
}
