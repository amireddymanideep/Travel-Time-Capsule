package com.traveltimecapsule.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssistantRequest(@NotBlank @Size(max = 1000) String message) {
}
