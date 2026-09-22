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
public class Task {
    private String id;
    private String title;
    private String caseId;
    private String caseNumber;
    private String caseTitle;
    private String assignedTo;
    private String assignedToName;
    private String assignedToAvatar;
    private String supervisorId;
    private String supervisorName;
    private String priority; // URGENT, HIGH, MEDIUM, LOW
    private TaskStatus status;
    private LocalDateTime dueAt;
    private String dueDateString;
    private String instructions;
    private LocalDateTime reminderAt;
    private boolean isStatutoryDeadline;
    private String statutoryReference;
    private String filingStatus; // NOT_FILED, FILED
    private String filingDate;
    private String filingReference;
    private String reviewFeedback;
    private boolean isAdministrative;
    private String cancellationReason;
    private String createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}
