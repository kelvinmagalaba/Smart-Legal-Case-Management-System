package com.slcms.model;

import java.time.LocalDateTime;

/**
 * Entity representing an authentic security event in SLCMS.
 * Stored separately in database for security auditing and access tracking.
 */
public class SecurityEvent {
    private String id;
    private String userId;
    private String userName;
    private EventType eventType;
    private String result;
    private LocalDateTime eventTime;
    private String description;
    private String ipAddress;
    private boolean resolved;
    private LocalDateTime resolvedAt;
    private String resolvedBy;

    public SecurityEvent() {
        this.eventTime = LocalDateTime.now();
        this.resolved = false;
    }

    public SecurityEvent(String id, String userId, EventType eventType, String description, String ipAddress) {
        this.id = id;
        this.userId = userId;
        this.eventType = eventType;
        this.description = description;
        this.ipAddress = ipAddress;
        this.eventTime = LocalDateTime.now();
        this.resolved = false;
    }

    public SecurityEvent(String id, String userId, String userName, EventType eventType, String result, String description, String ipAddress) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.eventType = eventType;
        this.result = result;
        this.description = description;
        this.ipAddress = ipAddress;
        this.eventTime = LocalDateTime.now();
        this.resolved = false;
    }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public LocalDateTime getEventTime() { return eventTime; }
    public void setEventTime(LocalDateTime eventTime) { this.eventTime = eventTime; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public boolean isResolved() { return resolved; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
}
