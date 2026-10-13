package com.traveltimecapsule.capsule;

import com.traveltimecapsule.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/capsules")
public class CapsuleController {
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final CapsuleRepository capsules;
    private final UserRepository users;

    public CapsuleController(CapsuleRepository capsules, UserRepository users) {
        this.capsules = capsules;
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CapsuleView> list(@AuthenticationPrincipal String userId) {
        return capsules.findAllByOwnerIdOrderByTravelDateDesc(parseUserId(userId))
                .stream().map(this::toView).toList();
    }

    @GetMapping("/timeline")
    @Transactional(readOnly = true)
    public List<CapsuleView> timeline(@AuthenticationPrincipal String userId) {
        return list(userId);
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public Map<String, Long> stats(@AuthenticationPrincipal String userId) {
        List<Capsule> owned = capsules.findAllByOwnerIdOrderByTravelDateDesc(parseUserId(userId));
        LocalDate today = LocalDate.now();
        long unlocked = owned.stream().filter(capsule -> !capsule.getUnlockDate().isAfter(today)).count();
        long totalPhotos = owned.stream().mapToLong(capsule -> capsule.getPhotos().size()).sum();
        long locations = owned.stream().map(Capsule::getDestination).distinct().count();
        return Map.of(
                "totalCapsules", (long) owned.size(),
                "unlockedCapsules", unlocked,
                "lockedCapsules", owned.size() - unlocked,
                "totalPhotos", totalPhotos,
                "totalLocations", locations);
    }

    @PostMapping
    public CapsuleView create(@AuthenticationPrincipal String userId, @Valid @RequestBody CapsuleRequest request) {
        if (request.unlockDate().isBefore(request.travelDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unlock date must be on or after the travel date.");
        }
        if (request.photoUrls() != null
                && request.photoUrls().stream().mapToLong(String::length).sum() > 26_000_000) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Combined photo data cannot exceed 20 MB.");
        }
        var owner = users.findById(parseUserId(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account no longer exists."));
        Capsule capsule = capsules.save(new Capsule(owner, request));
        return toView(capsule);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public CapsuleView get(@AuthenticationPrincipal String userId, @PathVariable Long id) {
        Capsule capsule = capsules.findByIdAndOwnerId(id, parseUserId(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Capsule not found."));
        return toView(capsule);
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public void delete(@AuthenticationPrincipal String userId, @PathVariable Long id) {
        Capsule capsule = capsules.findByIdAndOwnerId(id, parseUserId(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Capsule not found."));
        capsules.delete(capsule);
    }

    @PostMapping("/upload")
    public Map<String, String> upload(@AuthenticationPrincipal String userId, @RequestParam("file") MultipartFile file) {
        parseUserId(userId);
        if (file.isEmpty() || file.getSize() > 5_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an image smaller than 5 MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, WebP, or GIF images are supported.");
        }
        try {
            String dataUrl = "data:" + contentType + ";base64,"
                    + Base64.getEncoder().encodeToString(file.getBytes());
            return Map.of("url", dataUrl);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read the uploaded image.", exception);
        }
    }

    private CapsuleView toView(Capsule capsule) {
        boolean unlocked = !capsule.getUnlockDate().isAfter(LocalDate.now());
        long daysRemaining = unlocked ? 0 : ChronoUnit.DAYS.between(LocalDate.now(), capsule.getUnlockDate());
        return new CapsuleView(
                capsule.getId(),
                capsule.getTitle(),
                capsule.getDestination(),
                unlocked ? capsule.getLocation() : null,
                unlocked ? capsule.getCoordinates() : null,
                capsule.getTravelDate(),
                capsule.getUnlockDate(),
                unlocked ? capsule.getCompanions() : null,
                unlocked ? capsule.getExpenses() : null,
                unlocked ? capsule.getDescription() : null,
                unlocked ? capsule.getNote() : null,
                unlocked ? capsule.getVideoUrl() : null,
                unlocked ? List.copyOf(capsule.getPhotos()) : List.of(),
                unlocked,
                daysRemaining,
                capsule.getCreatedAt());
    }

    private Long parseUserId(String userId) {
        try {
            return Long.valueOf(userId);
        } catch (NumberFormatException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication token.");
        }
    }

    public record CapsuleView(
            Long id,
            String title,
            String destination,
            String location,
            String coordinates,
            LocalDate travelDate,
            LocalDate unlockDate,
            String companions,
            java.math.BigDecimal expenses,
            String description,
            String note,
            String videoUrl,
            List<String> photos,
            boolean isUnlocked,
            long daysRemaining,
            java.time.OffsetDateTime createdAt) {
    }
}
