package com.traveltimecapsule.capsule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CapsuleRepository extends JpaRepository<Capsule, Long> {
    List<Capsule> findAllByOwnerIdOrderByTravelDateDesc(Long ownerId);
    Optional<Capsule> findByIdAndOwnerId(Long id, Long ownerId);
    List<Capsule> findTop5ByOwnerIdAndUnlockDateLessThanEqualOrderByTravelDateDesc(
            Long ownerId, java.time.LocalDate unlockDate);

    @Query(value = """
            SELECT c.* FROM capsules c
            WHERE c.user_id = :ownerId
              AND c.unlock_date <= CURRENT_DATE
              AND to_tsvector('english', concat_ws(' ', c.title, c.destination, c.location,
                    c.companions, c.description, c.note))
                  @@ plainto_tsquery('english', :searchText)
            ORDER BY ts_rank(
                    to_tsvector('english', concat_ws(' ', c.title, c.destination, c.location,
                        c.companions, c.description, c.note)),
                    plainto_tsquery('english', :searchText)
                ) DESC,
                c.travel_date DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Capsule> searchUnlockedByOwner(
            @Param("ownerId") Long ownerId,
            @Param("searchText") String searchText);
}
