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
public class TaskHistory {
    private String id;
    private String taskId;
    private TaskStatus previousStatus;
    private TaskStatus newStatus;
    private String changedBy;
    private String changedByName;
    private String changeReason;
    private LocalDateTime changedAt;
}
