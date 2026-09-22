package com.slcms.controller;

import com.slcms.dto.AIQueryRequest;
import com.slcms.dto.AIQueryResponse;
import com.slcms.service.AIResearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for executing grounded AI legal research and passage retrieval.
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(originPatterns = "*")
public class AIQueryController {

    private final AIResearchService aiResearchService;

    @Autowired
    public AIQueryController(AIResearchService aiResearchService) {
        this.aiResearchService = aiResearchService;
    }

    /**
     * Executes grounded legal query retrieval against indexed passages.
     */
    @PostMapping("/query")
    public ResponseEntity<AIQueryResponse> executeLegalResearch(@RequestBody AIQueryRequest request) {
        if (request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        AIQueryResponse response = aiResearchService.processLegalQuery(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Executes progressive streaming legal query retrieval sending small text chunks over SSE.
     */
    @PostMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamLegalResearch(@RequestBody AIQueryRequest request) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = 
                new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(120_000L);
        aiResearchService.streamLegalQuery(request, emitter);
        return emitter;
    }
}
