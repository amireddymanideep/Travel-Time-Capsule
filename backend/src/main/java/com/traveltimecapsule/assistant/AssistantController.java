package com.traveltimecapsule.assistant;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    private final AssistantService assistant;

    public AssistantController(AssistantService assistant) {
        this.assistant = assistant;
    }

    @PostMapping("/chat")
    public AssistantResponse chat(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody AssistantRequest request) {
        return assistant.answer(userId, request.message().trim());
    }

    public record AssistantResponse(String answer, int memoriesUsed) {
    }
}
