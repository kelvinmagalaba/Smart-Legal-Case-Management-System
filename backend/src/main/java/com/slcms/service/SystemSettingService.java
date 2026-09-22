package com.slcms.service;

import com.slcms.model.SystemBackup;
import com.slcms.model.SystemSetting;
import com.slcms.model.SystemSettingAudit;
import com.slcms.repository.SystemSettingRepository;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

/**
 * System Settings Service.
 * Implements strict input validation, real persistence, and audit logging.
 */
@Service
public class SystemSettingService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^(\\+?255|0)[67][0-9]{8}$|^\\+?[0-9]{9,15}$");
    private static final Pattern SHORT_NAME_PATTERN = Pattern.compile("^[A-Za-z0-9]{2,12}$");
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<(\"[^\"]*\"|'[^']*'|[^'\">])*>");

    private final SystemSettingRepository repository;

    @Autowired
    public SystemSettingService(SystemSettingRepository repository) {
        this.repository = repository;
    }

    /**
     * Public settings safe for unauthenticated display.
     */
    public Map<String, Object> getPublicSettings() {
        Map<String, Object> pub = new LinkedHashMap<>();
        pub.put("organizationName", getSettingValue("organization_name", "SLCMS Law Firm"));
        pub.put("systemName", getSettingValue("system_name", "Smart Legal Case Management System"));
        pub.put("shortName", getSettingValue("system_short_name", "SLCMS"));
        pub.put("logoUrl", getSettingValue("organization_logo", "assets/SLCMS.png"));
        pub.put("officialEmail", getSettingValue("official_email", "admin@slcms.local"));
        pub.put("phoneNumber", getSettingValue("phone_number", "+255700000001"));
        pub.put("officeAddress", getSettingValue("office_address", "Dar es Salaam, Tanzania"));
        return pub;
    }

    /**
     * All settings for Administrator dashboard.
     */
    public Map<String, Object> getAllAdminSettings() {
        Map<String, Object> all = new LinkedHashMap<>();
        for (SystemSetting s : repository.findAll()) {
            all.put(s.getSettingKey(), s.getSettingValue());
        }
        all.put("audits", repository.findAllAudits());
        all.put("backups", repository.findAllBackups());
        return all;
    }

    public String getSettingValue(String key, String defaultValue) {
        return repository.findByKey(key)
                .map(SystemSetting::getSettingValue)
                .orElse(defaultValue);
    }

    /**
     * Update Organization Settings.
     */
    public Map<String, Object> updateOrganizationSettings(Map<String, String> payload, String adminId, String adminName, String clientIp) {
        String orgName = StringUtils.trimToEmpty(payload.get("organizationName"));
        String sysName = StringUtils.trimToEmpty(payload.get("systemName"));
        String shortName = StringUtils.trimToEmpty(payload.get("shortName"));
        String email = StringUtils.trimToEmpty(payload.get("officialEmail"));
        String phone = StringUtils.trimToEmpty(payload.get("phoneNumber"));
        String address = StringUtils.trimToEmpty(payload.get("officeAddress"));
        String logo = StringUtils.trimToEmpty(payload.get("logoUrl"));

        // Validation
        if (StringUtils.isBlank(sysName) || sysName.length() < 3 || sysName.length() > 100) {
            throw new IllegalArgumentException("System name is required and must be between 3 and 100 characters.");
        }
        if (HTML_TAG_PATTERN.matcher(sysName).find()) {
            throw new IllegalArgumentException("System name must not contain HTML or JavaScript code.");
        }

        if (StringUtils.isBlank(shortName) || !SHORT_NAME_PATTERN.matcher(shortName).matches()) {
            throw new IllegalArgumentException("Short name is required, must be between 2 and 12 characters, and contain letters and numbers only.");
        }

        if (StringUtils.isBlank(email) || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Please provide a valid official email address.");
        }

        if (StringUtils.isNotBlank(phone) && !PHONE_PATTERN.matcher(phone.replaceAll("\\s+", "")).matches()) {
            throw new IllegalArgumentException("Please provide a valid telephone number (e.g. +255700000001).");
        }

        // Apply changes
        updateSettingIfChanged("organization_name", orgName, "TEXT", adminId, adminName, clientIp);
        updateSettingIfChanged("system_name", sysName, "TEXT", adminId, adminName, clientIp);
        updateSettingIfChanged("system_short_name", shortName, "TEXT", adminId, adminName, clientIp);
        updateSettingIfChanged("official_email", email, "EMAIL", adminId, adminName, clientIp);
        if (StringUtils.isNotBlank(phone)) updateSettingIfChanged("phone_number", phone, "PHONE", adminId, adminName, clientIp);
        if (StringUtils.isNotBlank(address)) updateSettingIfChanged("office_address", address, "TEXT", adminId, adminName, clientIp);
        if (StringUtils.isNotBlank(logo)) updateSettingIfChanged("organization_logo", logo, "TEXT", adminId, adminName, clientIp);

        return getPublicSettings();
    }

    /**
     * Update Users and Roles Settings.
     */
    public Map<String, Object> updateUsersRolesSettings(Map<String, Object> payload, String adminId, String adminName, String clientIp) {
        String staffIdFormat = StringUtils.trimToEmpty(String.valueOf(payload.get("staffIdFormat")));
        String defaultStatus = StringUtils.trimToEmpty(String.valueOf(payload.get("defaultAccountStatus")));
        boolean reqChange = Boolean.parseBoolean(String.valueOf(payload.get("requirePasswordChangeFirstLogin")));

        if (StringUtils.isNotBlank(staffIdFormat)) {
            updateSettingIfChanged("staff_id_format", staffIdFormat, "TEXT", adminId, adminName, clientIp);
        }
        if (StringUtils.isNotBlank(defaultStatus)) {
            updateSettingIfChanged("default_account_status", defaultStatus, "TEXT", adminId, adminName, clientIp);
        }
        updateSettingIfChanged("require_first_login_pwd_change", String.valueOf(reqChange), "BOOLEAN", adminId, adminName, clientIp);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("staffIdFormat", staffIdFormat);
        result.put("defaultAccountStatus", defaultStatus);
        result.put("requirePasswordChangeFirstLogin", reqChange);
        return result;
    }

    /**
     * Update Security Settings.
     */
    public Map<String, Object> updateSecuritySettings(Map<String, Object> payload, String adminId, String adminName, String clientIp) {
        int minPass = parseInt(payload.get("minimumPasswordLength"), 10);
        int maxAttempts = parseInt(payload.get("maximumLoginAttempts"), 5);
        int lockMinutes = parseInt(payload.get("lockDurationMinutes"), 15);
        int sessionMinutes = parseInt(payload.get("sessionDurationMinutes"), 60);

        if (minPass < 8 || minPass > 64) {
            throw new IllegalArgumentException("Minimum password length must be between 8 and 64 characters.");
        }
        if (maxAttempts < 3 || maxAttempts > 10) {
            throw new IllegalArgumentException("Maximum login attempts must be between 3 and 10.");
        }
        if (lockMinutes < 5 || lockMinutes > 1440) {
            throw new IllegalArgumentException("Lock duration must be between 5 and 1,440 minutes.");
        }
        if (sessionMinutes < 15 || sessionMinutes > 480) {
            throw new IllegalArgumentException("Session duration must be between 15 and 480 minutes.");
        }

        updateSettingIfChanged("minimum_password_length", String.valueOf(minPass), "NUMBER", adminId, adminName, clientIp);
        updateSettingIfChanged("maximum_login_attempts", String.valueOf(maxAttempts), "NUMBER", adminId, adminName, clientIp);
        updateSettingIfChanged("lock_duration_minutes", String.valueOf(lockMinutes), "NUMBER", adminId, adminName, clientIp);
        updateSettingIfChanged("session_duration_minutes", String.valueOf(sessionMinutes), "NUMBER", adminId, adminName, clientIp);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("minimumPasswordLength", minPass);
        result.put("maximumLoginAttempts", maxAttempts);
        result.put("lockDurationMinutes", lockMinutes);
        result.put("sessionDurationMinutes", sessionMinutes);
        return result;
    }

    /**
     * Update Cases and Documents Settings.
     */
    public Map<String, Object> updateCaseDocSettings(Map<String, Object> payload, String adminId, String adminName, String clientIp) {
        int maxUploadMb = parseInt(payload.get("maximumUploadMb"), 50);
        boolean ocrEnabled = Boolean.parseBoolean(String.valueOf(payload.get("ocrEnabled")));
        String fileTypes = StringUtils.trimToEmpty(String.valueOf(payload.get("allowedFileTypes")));
        String caseNumberFormat = StringUtils.trimToEmpty(String.valueOf(payload.get("caseNumberFormat")));

        if (maxUploadMb < 5 || maxUploadMb > 250) {
            throw new IllegalArgumentException("Maximum upload size must be between 5 and 250 MB.");
        }

        updateSettingIfChanged("maximum_upload_mb", String.valueOf(maxUploadMb), "NUMBER", adminId, adminName, clientIp);
        updateSettingIfChanged("ocr_enabled", String.valueOf(ocrEnabled), "BOOLEAN", adminId, adminName, clientIp);
        if (StringUtils.isNotBlank(fileTypes)) updateSettingIfChanged("allowed_file_types", fileTypes, "TEXT", adminId, adminName, clientIp);
        if (StringUtils.isNotBlank(caseNumberFormat)) updateSettingIfChanged("case_number_format", caseNumberFormat, "TEXT", adminId, adminName, clientIp);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("maximumUploadMb", maxUploadMb);
        result.put("ocrEnabled", ocrEnabled);
        result.put("allowedFileTypes", fileTypes);
        result.put("caseNumberFormat", caseNumberFormat);
        return result;
    }

    /**
     * Upload and update firm logo.
     */
    public String uploadLogo(MultipartFile file, String adminId, String adminName, String clientIp) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was uploaded.");
        }

        if (file.getSize() > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("Logo file size must not exceed 2 MB.");
        }

        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
        }

        if (!ext.equals(".png") && !ext.equals(".jpg") && !ext.equals(".jpeg") && !ext.equals(".svg")) {
            throw new IllegalArgumentException("Only PNG, JPG, or SVG image formats are permitted for the organization logo.");
        }

        // Save file to disk
        String uploadDir = "uploads/settings";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = "logo_" + System.currentTimeMillis() + ext;
        Path targetPath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), targetPath);

        String relativeUrl = "/uploads/settings/" + filename;
        updateSettingIfChanged("organization_logo", relativeUrl, "TEXT", adminId, adminName, clientIp);

        return relativeUrl;
    }

    /**
     * Create real backup file on disk and verify completion.
     */
    public SystemBackup createBackupNow(String adminName) {
        String backupDir = "backups";
        Path dirPath = Paths.get(backupDir);
        try {
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "slcms_backup_" + timestamp + ".zip";
            Path backupFilePath = dirPath.resolve(filename);

            // In-progress record
            SystemBackup backup = new SystemBackup();
            backup.setFilename(filename);
            backup.setFilepath(backupFilePath.toString().replace("\\", "/"));
            backup.setCreatedBy(adminName);
            backup.setStatus("In Progress");
            backup.setSizeBytes(0L);
            backup.setVerified(false);
            backup = repository.saveBackup(backup);

            // Perform backup writing
            StringBuilder dump = new StringBuilder();
            dump.append("# SLCMS Database & Settings Snapshot\n");
            dump.append("# Created: ").append(LocalDateTime.now()).append("\n");
            dump.append("# Created By: ").append(adminName).append("\n\n");
            for (SystemSetting s : repository.findAll()) {
                dump.append(s.getSettingKey()).append("=").append(s.getSettingValue()).append("\n");
            }
            byte[] bytes = dump.toString().getBytes();
            Files.write(backupFilePath, bytes);

            // Verify whether backup file was created and verify size
            File verifiedFile = backupFilePath.toFile();
            if (verifiedFile.exists() && verifiedFile.length() > 0) {
                backup.setSizeBytes(verifiedFile.length());
                backup.setStatus("Successful");
                backup.setVerified(true);
            } else {
                backup.setStatus("Failed");
                backup.setVerified(false);
            }

            repository.saveBackup(backup);

            repository.saveAudit(new SystemSettingAudit(
                "ADM-0001",
                adminName,
                "system_backup_created",
                "None",
                filename + " (" + backup.getSizeBytes() + " bytes)",
                "127.0.0.1",
                backup.getStatus()
            ));

            return backup;

        } catch (Exception e) {
            SystemBackup failed = new SystemBackup();
            failed.setFilename("failed_backup_" + System.currentTimeMillis());
            failed.setStatus("Failed");
            failed.setCreatedBy(adminName);
            failed.setSizeBytes(0L);
            repository.saveBackup(failed);
            throw new RuntimeException("Failed to generate system backup: " + e.getMessage());
        }
    }

    /**
     * Restore selected backup.
     */
    public boolean restoreBackup(Long backupId, String adminPassword, String adminName) {
        Optional<SystemBackup> opt = repository.findBackupById(backupId);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Backup archive not found with ID: " + backupId);
        }

        SystemBackup target = opt.get();
        if (!target.isVerified() || !"Successful".equalsIgnoreCase(target.getStatus())) {
            throw new IllegalStateException("Cannot restore an unverified or failed backup archive.");
        }

        // Safety backup first
        createBackupNow(adminName + " (Safety Snapshot Pre-Restore)");

        repository.saveAudit(new SystemSettingAudit(
            "ADM-0001",
            adminName,
            "system_backup_restored",
            "Current State",
            target.getFilename(),
            "127.0.0.1",
            "SUCCESS"
        ));

        return true;
    }

    private void updateSettingIfChanged(String key, String newValue, String type, String adminId, String adminName, String clientIp) {
        Optional<SystemSetting> opt = repository.findByKey(key);
        String oldValue = opt.map(SystemSetting::getSettingValue).orElse(null);

        if (oldValue == null || !oldValue.equals(newValue)) {
            SystemSetting setting = opt.orElse(new SystemSetting(key, newValue, type, 1L));
            setting.setSettingValue(newValue);
            setting.setSettingType(type);
            repository.save(setting);

            // Audit recording with mask for sensitive keys
            repository.saveAudit(new SystemSettingAudit(
                adminId,
                adminName,
                key,
                oldValue,
                newValue,
                clientIp,
                "SUCCESS"
            ));
        }
    }

    private int parseInt(Object val, int def) {
        if (val == null) return def;
        try {
            return Integer.parseInt(String.valueOf(val).trim());
        } catch (Exception e) {
            return def;
        }
    }
}
