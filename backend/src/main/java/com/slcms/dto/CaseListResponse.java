package com.slcms.dto;

/**
 * Standardized Case List Response Record for SLCMS.
 * Guarantees unified field names and non-null values for the Admin & Counsel Cases views.
 */
public record CaseListResponse(
    Long id,
    String caseTitle,
    String caseNumber,
    String caseType,
    String status,
    String clientName,
    String court,
    String registry
) {
    /**
     * Factory constructor providing safe defaults for missing or null entity fields.
     */
    public static CaseListResponse of(
            Long id,
            String caseTitle,
            String caseNumber,
            String caseType,
            String status,
            String clientName,
            String court,
            String registry
    ) {
        return new CaseListResponse(
            id != null ? id : 0L,
            safeText(caseTitle, "Untitled Case"),
            safeText(caseNumber, "Not provided"),
            safeText(caseType, "OTHER"),
            safeText(status, "UNASSIGNED"),
            safeText(clientName, "No client linked"),
            safeText(court, "Not provided"),
            safeText(registry, "")
        );
    }

    private static String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
