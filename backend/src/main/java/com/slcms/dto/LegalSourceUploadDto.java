package com.slcms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Form data payload for legal document upload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegalSourceUploadDto {

    private String title;
    private String source;
    private String tanzliiUrl;
    private String court;
    private String caseNumber;
    private String decisionDate;
    private String category;
    private String description;
    private String accessLevel;
    private String relatedCaseId;
}
