package com.slcms.dto;

import com.slcms.model.LegalPassage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIQueryResponse {

    private String directAnswer;
    private String legalExplanation;
    private List<String> limitations;
    private List<LegalPassage> retrievedPassages;
    private List<SourceReferenceDto> citedSources;
    private boolean requiresProfessionalReview;
    private String queryIntent;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceReferenceDto {
        private String sourceId;
        private String title;
        private String court;
        private String citation;
        private String decisionDate;
        private String tanzliiUrl;
        private double relevanceScore;
        private String extractedPassageSnippet;
    }
}
