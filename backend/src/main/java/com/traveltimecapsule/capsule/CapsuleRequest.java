package com.traveltimecapsule.capsule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CapsuleRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank @Size(max = 150) String destination,
        @Size(max = 300) String location,
        @Size(max = 100) String coordinates,
        @NotNull @PastOrPresent LocalDate travelDate,
        @NotNull LocalDate unlockDate,
        @Size(max = 500) String companions,
        @DecimalMin("0.00") BigDecimal expenses,
        @Size(max = 10000) String description,
        @Size(max = 10000) String note,
        @Size(max = 2048) String videoUrl,
        @Size(max = 20) List<@Size(max = 8_000_000) String> photoUrls,
        Long userId) {
}
