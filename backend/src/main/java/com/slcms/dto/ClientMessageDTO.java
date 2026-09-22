package com.slcms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Client Communications and Notifications.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientMessageDTO {
    private String messageId;
    private String caseId;
    private String caseTitle;
    private String caseNumber;
    private String clientId;
    private String clientName;
    private String messageType;
    private String channel;
    private String recipient;
    private String subject;
    private String messageBody;
    private String language;
    private String status;
    private String preparedBy;
    private String approvedBy;
    private String sentBy;
    private String scheduledAt;
    private String sentAt;
    private String providerReference;
    private String failureReason;
    private String createdAt;
    private String updatedAt;
}
