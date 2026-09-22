package com.slcms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents an indexed, searchable legal passage extracted from a legal source document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalPassage {

    private String id;
    private String documentId;
    private int passageIndex;
    private String text;
    private int pageNumber;
    private int characterStart;
    private int characterEnd;
    private int wordCount;
    private double relevanceScore;
    
    // Legal metadata
    private boolean isRatioDecidendi;
    private String statutorySectionRef;
    private String courtHierarchy;
    private LocalDateTime indexedAt;
}
