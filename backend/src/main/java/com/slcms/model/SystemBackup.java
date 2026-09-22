package com.slcms.model;

import java.time.LocalDateTime;

/**
 * Entity representing a system backup archive and its verification status.
 */
public class SystemBackup {

    private Long id;
    private String filename;
    private String filepath;
    private Long sizeBytes;
    private String status; // 'Not Created', 'In Progress', 'Successful', 'Failed'
    private String createdBy;
    private boolean verified;
    private LocalDateTime createdAt;

    public SystemBackup() {
        this.status = "Not Created";
        this.createdAt = LocalDateTime.now();
    }

    public SystemBackup(Long id, String filename, String filepath, Long sizeBytes, String status, String createdBy, boolean verified) {
        this.id = id;
        this.filename = filename;
        this.filepath = filepath;
        this.sizeBytes = sizeBytes;
        this.status = status;
        this.createdBy = createdBy;
        this.verified = verified;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getFilepath() {
        return filepath;
    }

    public void setFilepath(String filepath) {
        this.filepath = filepath;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
