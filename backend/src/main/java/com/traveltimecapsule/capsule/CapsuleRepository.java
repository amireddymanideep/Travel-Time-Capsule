package com.traveltimecapsule.capsule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CapsuleRepository extends JpaRepository<Capsule, Long> {
    List<Capsule> findAllByOwnerIdOrderByTravelDateDesc(Long ownerId);
    Optional<Capsule> findByIdAndOwnerId(Long id, Long ownerId);
}
