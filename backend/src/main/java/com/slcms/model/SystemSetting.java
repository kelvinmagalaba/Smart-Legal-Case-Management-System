package com.slcms.model;

import java.time.LocalDateTime;

/**
 * System Setting entity representing a persistent configuration parameter.
 */
public class SystemSetting {

    private Long id;
    private String settingKey;
    private String settingValue;
    private String settingType; // TEXT, NUMBER, BOOLEAN, EMAIL, PHONE, ENUM
    private Long updatedBy;
    private LocalDateTime updatedAt;

    public SystemSetting() {
        this.updatedAt = LocalDateTime.now();
    }

    public SystemSetting(String settingKey, String settingValue, String settingType, Long updatedBy) {
        this.settingKey = settingKey;
        this.settingValue = settingValue;
        this.settingType = settingType;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }

    public SystemSetting(Long id, String settingKey, String settingValue, String settingType, Long updatedBy, LocalDateTime updatedAt) {
        this.id = id;
        this.settingKey = settingKey;
        this.settingValue = settingValue;
        this.settingType = settingType;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt != null ? updatedAt : LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSettingKey() {
        return settingKey;
    }

    public void setSettingKey(String settingKey) {
        this.settingKey = settingKey;
    }

    public String getSettingValue() {
        return settingValue;
    }

    public void setSettingValue(String settingValue) {
        this.settingValue = settingValue;
    }

    public String getSettingType() {
        return settingType;
    }

    public void setSettingType(String settingType) {
        this.settingType = settingType;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
