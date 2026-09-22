package com.slcms.controller;

import com.slcms.dto.LegalSourceUploadDto;
import com.slcms.model.LegalPassage;
import com.slcms.model.LegalSourceDocument;
import com.slcms.service.LegalDocumentIndexingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for multipart file upload, extracted text preview, and passage exploration.
 */
@RestController
@RequestMapping("/api/legal-sources")
@CrossOrigin(originPatterns = "*")
public class LegalSourceUploadController {

    private final LegalDocumentIndexingService indexingService;

    @Autowired
    public LegalSourceUploadController(LegalDocumentIndexingService indexingService) {
        this.indexingService = indexingService;
    }

    /**
     * Multipart File Upload Endpoint.
     * Saves file, extracts text via Apache PDFBox/OCR, segments into passages, marks Ready for AI.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadLegalDocument(
            @RequestParam("file") MultipartFile file,
            @ModelAttribute LegalSourceUploadDto metadata,
            @RequestHeader(value = "X-User-Name", required = false, defaultValue = "Authorized Counsel") String uploadedBy
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please select a valid PDF, DOCX or TXT legal document to upload."
            ));
        }

        try {
            LegalSourceDocument indexedDoc = indexingService.processAndIndexDocument(file, metadata, uploadedBy);
            
            boolean isReady = indexedDoc.getStatus() == LegalSourceDocument.DocumentStatus.READY_FOR_AI;
            
            return ResponseEntity.ok(Map.of(
                    "success", isReady,
                    "documentId", indexedDoc.getId(),
                    "title", indexedDoc.getTitle(),
                    "status", indexedDoc.getStatus(),
                    "totalPassagesCount", indexedDoc.getPassages().size(),
                    "totalWordCount", indexedDoc.getTotalWordCount(),
                    "totalCharacterCount", indexedDoc.getTotalCharacterCount(),
                    "ocrApplied", indexedDoc.isOcrApplied(),
                    "failureReason", indexedDoc.getFailureReason() != null ? indexedDoc.getFailureReason() : "",
                    "document", indexedDoc
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Failed to process legal document: " + e.getMessage()
            ));
        }
    }

    /**
     * Lists all legal source documents in the library.
     */
    @GetMapping
    public ResponseEntity<List<LegalSourceDocument>> listLegalDocuments() {
        return ResponseEntity.ok(indexingService.getAllDocuments());
    }

    /**
     * Retrieves full document details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDocument(@PathVariable String id) {
        return indexingService.getDocumentById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Endpoint to Preview Extracted Text.
     * Returns raw extracted text and word/character analytics.
     */
    @GetMapping("/{id}/extracted-text")
    public ResponseEntity<?> previewExtractedText(@PathVariable String id) {
        return indexingService.getDocumentById(id)
                .map(doc -> {
                    Map<String, Object> resp = new HashMap<>();
                    resp.put("documentId", doc.getId());
                    resp.put("title", doc.getTitle());
                    resp.put("court", doc.getCourt());
                    resp.put("status", doc.getStatus());
                    resp.put("totalWordCount", doc.getTotalWordCount());
                    resp.put("totalCharacterCount", doc.getTotalCharacterCount());
                    resp.put("totalPages", doc.getTotalPages());
                    resp.put("ocrApplied", doc.isOcrApplied());
                    resp.put("totalPassagesCount", doc.getPassages().size());
                    resp.put("rawExtractedText", doc.getRawExtractedText() != null ? doc.getRawExtractedText() : "No text extracted.");
                    return ResponseEntity.ok(resp);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Retrieves all segmented legal passages for a document.
     */
    @GetMapping("/{id}/passages")
    public ResponseEntity<List<LegalPassage>> getDocumentPassages(@PathVariable String id) {
        List<LegalPassage> passages = indexingService.getPassagesByDocumentId(id);
        return ResponseEntity.ok(passages);
    }

    /**
     * Deletes a legal source document.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable String id) {
        boolean deleted = indexingService.deleteDocument(id);
        return deleted ? ResponseEntity.ok(Map.of("success", true)) : ResponseEntity.notFound().build();
    }
}
