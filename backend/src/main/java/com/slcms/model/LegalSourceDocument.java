package com.slcms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a Legal Source Document indexed in the SLCMS Legal Library.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalSourceDocument {

    private String id;
    private String title;
    private String sourceName; // e.g. "TanzLII (Tanzania Legal Information Institute)"
    private String tanzliiUrl;
    private String court;
    private String caseNumber;
    private LocalDate decisionDate;
    private String category; // e.g. "Commercial law", "Land law", "Probate and Family law"
    private String description;
    
    // Access Control & RBAC
    private String accessLevel; // "Public Legal Library", "Entire Law Firm", "Selected Users", "Related Case Only", "Private to Me"
    private String relatedCaseId;
    private String uploadedBy;
    private LocalDateTime uploadedAt;

    // Processing & Extraction State
    private DocumentStatus status; // UPLOADED, EXTRACTING_TEXT, INDEXING, READY_FOR_AI, PROCESSING_FAILED
    private String failureReason;
    private String storedFilePath;
    private String originalFileName;
    private String fileType; // PDF, DOCX, TXT
    private long fileSizeBytes;

    // Extracted content
    private String rawExtractedText;
    private int totalWordCount;
    private int totalCharacterCount;
    private int totalPages;
    private boolean ocrApplied;

    // Searchable passages
    @Builder.Default
    private List<LegalPassage> passages = new ArrayList<>();

    public enum DocumentStatus {
        UPLOADED,
        EXTRACTING_TEXT,
        INDEXING,
        READY_FOR_AI,
        PROCESSING_FAILED
    }
}
