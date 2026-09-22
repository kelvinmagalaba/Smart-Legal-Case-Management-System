package com.slcms.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.slcms.model.SystemBackup;
import com.slcms.model.SystemSetting;
import com.slcms.model.SystemSettingAudit;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * High-performance, thread-safe, permanent disk-backed repository for System Settings,
 * Audit Logs, and Backup Verification.
 * Persists data to disk so every saved setting survives restarts, refreshes, and server stops.
 */
@Repository
public class SystemSettingRepository {

    private static final String DATA_DIR = "data";
    private static final String SETTINGS_FILE = "data/system_settings.json";
    private static final String AUDIT_FILE = "data/system_settings_audit.json";
    private static final String BACKUPS_FILE = "data/system_backups.json";

    private final ObjectMapper objectMapper;
    private final Map<String, SystemSetting> settingsMap = new ConcurrentHashMap<>();
    private final List<SystemSettingAudit> auditList = Collections.synchronizedList(new ArrayList<>());
    private final List<SystemBackup> backupList = Collections.synchronizedList(new ArrayList<>());
    private final AtomicLong idSequence = new AtomicLong(100);

    public SystemSettingRepository() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        initStorage();
    }

    private synchronized void initStorage() {
        try {
            Path dir = Paths.get(DATA_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }

            File setFile = new File(SETTINGS_FILE);
            if (setFile.exists() && setFile.length() > 0) {
                List<SystemSetting> loaded = objectMapper.readValue(setFile, new TypeReference<List<SystemSetting>>() {});
                for (SystemSetting s : loaded) {
                    settingsMap.put(s.getSettingKey(), s);
                    if (s.getId() != null && s.getId() > idSequence.get()) {
                        idSequence.set(s.getId());
                    }
                }
            } else {
                seedDefaults();
                flushSettings();
            }

            File audFile = new File(AUDIT_FILE);
            if (audFile.exists() && audFile.length() > 0) {
                List<SystemSettingAudit> loaded = objectMapper.readValue(audFile, new TypeReference<List<SystemSettingAudit>>() {});
                auditList.addAll(loaded);
            }

            File bkpFile = new File(BACKUPS_FILE);
            if (bkpFile.exists() && bkpFile.length() > 0) {
                List<SystemBackup> loaded = objectMapper.readValue(bkpFile, new TypeReference<List<SystemBackup>>() {});
                backupList.addAll(loaded);
            } else {
                seedInitialBackupRecord();
                flushBackups();
            }
        } catch (Exception e) {
            seedDefaults();
        }
    }

    private void seedDefaults() {
        addOrUpdateMemory(new SystemSetting(1L, "organization_name", "SLCMS Law Firm", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(2L, "system_name", "Smart Legal Case Management System", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(3L, "system_short_name", "SLCMS", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(4L, "organization_logo", "assets/SLCMS.png", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(5L, "official_email", "admin@slcms.local", "EMAIL", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(6L, "phone_number", "+255700000001", "PHONE", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(7L, "office_address", "Dar es Salaam, Tanzania", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(8L, "minimum_password_length", "10", "NUMBER", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(9L, "maximum_login_attempts", "5", "NUMBER", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(10L, "lock_duration_minutes", "15", "NUMBER", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(11L, "session_duration_minutes", "60", "NUMBER", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(12L, "maximum_upload_mb", "50", "NUMBER", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(13L, "ocr_enabled", "true", "BOOLEAN", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(14L, "automatic_backup", "WEEKLY", "ENUM", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(15L, "allowed_file_types", "PDF,DOCX,JPG,PNG", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(16L, "case_number_format", "CV/YYYY/####", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(17L, "case_categories", "Civil,Criminal,Land,Matrimonial,Probate,Commercial,Other", "TEXT", 1L, LocalDateTime.now()));
        addOrUpdateMemory(new SystemSetting(18L, "case_statuses", "Active,Pending,Closed,Archived", "TEXT", 1L, LocalDateTime.now()));
    }

    private void seedInitialBackupRecord() {
        backupList.add(new SystemBackup(
            1L,
            "slcms_initial_snapshot_20260908.enc",
            "backups/slcms_initial_snapshot_20260908.enc",
            14829312L,
            "Successful",
            "System Automation",
            true
        ));
    }

    private void addOrUpdateMemory(SystemSetting s) {
        settingsMap.put(s.getSettingKey(), s);
    }

    public synchronized void flushSettings() {
        try {
            objectMapper.writeValue(new File(SETTINGS_FILE), new ArrayList<>(settingsMap.values()));
        } catch (IOException e) {
            System.err.println("Failed to flush system settings to disk: " + e.getMessage());
        }
    }

    public synchronized void flushAudit() {
        try {
            objectMapper.writeValue(new File(AUDIT_FILE), auditList);
        } catch (IOException e) {
            System.err.println("Failed to flush system audit to disk: " + e.getMessage());
        }
    }

    public synchronized void flushBackups() {
        try {
            objectMapper.writeValue(new File(BACKUPS_FILE), backupList);
        } catch (IOException e) {
            System.err.println("Failed to flush backups to disk: " + e.getMessage());
        }
    }

    public List<SystemSetting> findAll() {
        return new ArrayList<>(settingsMap.values());
    }

    public Optional<SystemSetting> findByKey(String key) {
        if (key == null) return Optional.empty();
        return Optional.ofNullable(settingsMap.get(key));
    }

    public synchronized SystemSetting save(SystemSetting setting) {
        if (setting.getId() == null) {
            setting.setId(idSequence.incrementAndGet());
        }
        setting.setUpdatedAt(LocalDateTime.now());
        settingsMap.put(setting.getSettingKey(), setting);
        flushSettings();
        return setting;
    }

    public synchronized void saveAudit(SystemSettingAudit audit) {
        if (audit.getId() == null) {
            audit.setId(System.currentTimeMillis());
        }
        auditList.add(0, audit);
        flushAudit();
    }

    public List<SystemSettingAudit> findAllAudits() {
        return new ArrayList<>(auditList);
    }

    public List<SystemBackup> findAllBackups() {
        return new ArrayList<>(backupList);
    }

    public Optional<SystemBackup> findBackupById(Long id) {
        return backupList.stream().filter(b -> Objects.equals(b.getId(), id)).findFirst();
    }

    public synchronized SystemBackup saveBackup(SystemBackup backup) {
        if (backup.getId() == null) {
            backup.setId(System.currentTimeMillis());
        }
        backupList.removeIf(b -> Objects.equals(b.getId(), backup.getId()));
        backupList.add(0, backup);
        flushBackups();
        return backup;
    }
}
