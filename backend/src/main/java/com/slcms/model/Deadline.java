package com.slcms.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deadline {
    private String id;
    private String title;
    private String caseId;
    private String caseNumber;
    private String caseTitle;
    private String type; // Hearing, Mention, Filing, Submission, Appeal, Other
    private LocalDateTime deadlineAt;
    private String deadlineDateString;
    private String court;
    private String registry;
    private String responsibleLawyerId;
    private String responsibleLawyerName;
    private String source; // Court Order, Legislation, Manually Entered
    private String statutoryReference;
    private LocalDateTime reminderAt;
    private String supportingDocument;
    private String changeReason;
    private LocalDateTime previousDeadlineAt;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
