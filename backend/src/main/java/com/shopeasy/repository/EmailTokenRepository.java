package com.shopeasy.repository;

import com.shopeasy.entity.EmailToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {
    Optional<EmailToken> findByTokenHashAndType(String tokenHash, String type);

    /** Newest token of this kind for the user (used for the "wait a minute before asking again" cooldown). */
    Optional<EmailToken> findFirstByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);

    List<EmailToken> findByUserIdAndTypeAndUsedAtIsNull(Long userId, String type);

    @Modifying
    @Query("delete from EmailToken t where t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
