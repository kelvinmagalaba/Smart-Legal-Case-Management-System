package com.slcms.model;

import java.time.LocalDateTime;

/**
 * Audit record for settings changes.
 * Masks sensitive values to ensure secret credentials/keys are never exposed in logs.
 */
public class SystemSettingAudit {

    private Long id;
    private String adminId;
    private String adminName;
    private String settingKey;
    private String previousValue;
    private String newValue;
    private String ipAddress;
    private String actionStatus; // SUCCESS, BLOCKED, FAILED
    private LocalDateTime createdAt;

    public SystemSettingAudit() {
        this.createdAt = LocalDateTime.now();
        this.actionStatus = "SUCCESS";
    }

    public SystemSettingAudit(String adminId, String adminName, String settingKey, String previousValue, String newValue, String ipAddress, String actionStatus) {
        this.adminId = adminId;
        this.adminName = adminName;
        this.settingKey = settingKey;
        this.previousValue = maskIfSensitive(settingKey, previousValue);
        this.newValue = maskIfSensitive(settingKey, newValue);
        this.ipAddress = ipAddress != null ? ipAddress : "127.0.0.1";
        this.actionStatus = actionStatus != null ? actionStatus : "SUCCESS";
        this.createdAt = LocalDateTime.now();
    }

    public static String maskIfSensitive(String key, String value) {
        if (key == null || value == null) return value;
        String lower = key.toLowerCase();
        if (lower.contains("password") || lower.contains("secret") || lower.contains("key") || lower.contains("token")) {
            return "Security configuration updated.";
        }
        return value;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAdminId() {
        return adminId;
    }

    public void setAdminId(String adminId) {
        this.adminId = adminId;
    }

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }

    public String getSettingKey() {
        return settingKey;
    }

    public void setSettingKey(String settingKey) {
        this.settingKey = settingKey;
    }

    public String getPreviousValue() {
        return previousValue;
    }

    public void setPreviousValue(String previousValue) {
        this.previousValue = maskIfSensitive(this.settingKey, previousValue);
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = maskIfSensitive(this.settingKey, newValue);
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getActionStatus() {
        return actionStatus;
    }

    public void setActionStatus(String actionStatus) {
        this.actionStatus = actionStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
