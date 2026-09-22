package com.slcms.model;

import java.time.LocalDateTime;

/**
 * Entity representing an authentic security alert in SLCMS.
 * Security alerts only exist when a real database event occurs.
 */
public class SecurityAlert {
    private String alertId;
    private String userId;
    private String staffId;
    private String fullName;
    private String role;
    private AlertType alertType;
    private String title;
    private String description;
    private String severity; // HIGH, MEDIUM, LOW
    private LocalDateTime createdAt;
    private boolean resolved;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private String lockedReason;
    private String lockedBy;
    private String clientIp;

    public SecurityAlert() {
        this.createdAt = LocalDateTime.now();
        this.resolved = false;
    }

    public SecurityAlert(String alertId, String userId, String staffId, String fullName, String role,
                         AlertType alertType, String title, String description, String severity) {
        this.alertId = alertId;
        this.userId = userId;
        this.staffId = staffId;
        this.fullName = fullName;
        this.role = role;
        this.alertType = alertType;
        this.title = title;
        this.description = description;
        this.severity = severity != null ? severity : "MEDIUM";
        this.createdAt = LocalDateTime.now();
        this.resolved = false;
    }

    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public AlertType getAlertType() { return alertType; }
    public void setAlertType(AlertType alertType) { this.alertType = alertType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isResolved() { return resolved; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public String getLockedReason() { return lockedReason; }
    public void setLockedReason(String lockedReason) { this.lockedReason = lockedReason; }

    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String lockedBy) { this.lockedBy = lockedBy; }

    public String getClientIp() { return clientIp; }
    public void setClientIp(String clientIp) { this.clientIp = clientIp; }
}
