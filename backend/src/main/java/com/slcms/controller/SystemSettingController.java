package com.slcms.controller;

import com.slcms.model.SystemBackup;
import com.slcms.service.SystemSettingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * REST Controller for System Settings, Governance Rules, and Disaster Recovery Backups.
 */
@RestController
@CrossOrigin(originPatterns = "*")
public class SystemSettingController {

    private final SystemSettingService settingService;

    @Autowired
    public SystemSettingController(SystemSettingService settingService) {
        this.settingService = settingService;
    }

    /**
     * Public settings safe for unauthenticated visitors and system startup.
     * Contains NO sensitive security rules, passwords, or internal paths.
     */
    @GetMapping("/api/settings/public")
    public ResponseEntity<Map<String, Object>> getPublicSettings() {
        return ResponseEntity.ok(settingService.getPublicSettings());
    }

    /**
     * Complete settings manifest for the Administrator console.
     */
    @GetMapping("/api/admin/settings")
    public ResponseEntity<?> getAllAdminSettings(@RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }
        return ResponseEntity.ok(settingService.getAllAdminSettings());
    }

    /**
     * Update Organization Identity & Presentation settings.
     */
    @PutMapping("/api/admin/settings/organization")
    public ResponseEntity<?> updateOrganization(
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            HttpServletRequest request) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminId = userId != null ? userId : "usr-001";
            String adminName = userName != null ? userName : "Neema Joseph";
            String ip = request.getRemoteAddr();

            Map<String, Object> updated = settingService.updateOrganizationSettings(payload, adminId, adminName, ip);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Settings saved successfully. The new system name has been applied.");
            response.put("settings", updated);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", "Changes were not saved. Please try again.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Update Users & Roles Governance.
     */
    @PutMapping("/api/admin/settings/users-roles")
    public ResponseEntity<?> updateUsersRoles(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            HttpServletRequest request) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminId = userId != null ? userId : "usr-001";
            String adminName = userName != null ? userName : "Neema Joseph";
            String ip = request.getRemoteAddr();

            Map<String, Object> updated = settingService.updateUsersRolesSettings(payload, adminId, adminName, ip);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "User and role settings saved successfully.");
            response.put("settings", updated);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update Login & Security Rules.
     */
    @PutMapping("/api/admin/settings/security")
    public ResponseEntity<?> updateSecurity(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            HttpServletRequest request) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminId = userId != null ? userId : "usr-001";
            String adminName = userName != null ? userName : "Neema Joseph";
            String ip = request.getRemoteAddr();

            Map<String, Object> updated = settingService.updateSecuritySettings(payload, adminId, adminName, ip);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Security settings saved successfully.");
            response.put("settings", updated);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update Cases & Documents Rules.
     */
    @PutMapping("/api/admin/settings/cases-documents")
    public ResponseEntity<?> updateCasesDocuments(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            HttpServletRequest request) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminId = userId != null ? userId : "usr-001";
            String adminName = userName != null ? userName : "Neema Joseph";
            String ip = request.getRemoteAddr();

            Map<String, Object> updated = settingService.updateCaseDocSettings(payload, adminId, adminName, ip);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("message", "Case and document settings saved successfully.");
            response.put("settings", updated);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Upload Organization Logo.
     */
    @PostMapping("/api/admin/settings/logo")
    public ResponseEntity<?> uploadLogo(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            HttpServletRequest request) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminId = userId != null ? userId : "usr-001";
            String adminName = userName != null ? userName : "Neema Joseph";
            String ip = request.getRemoteAddr();

            String logoUrl = settingService.uploadLogo(file, adminId, adminName, ip);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("logoUrl", logoUrl);
            response.put("message", "Logo uploaded and applied successfully.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", "Failed to upload logo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Trigger immediate database snapshot backup.
     */
    @PostMapping("/api/admin/backups")
    public ResponseEntity<?> createBackup(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Name", required = false) String userName) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        try {
            String adminName = userName != null ? userName : "Neema Joseph";
            SystemBackup backup = settingService.createBackupNow(adminName);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("backup", backup);
            response.put("message", "Backup created and verified successfully.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", "Backup generation failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * List all verified backups.
     */
    @GetMapping("/api/admin/backups")
    public ResponseEntity<?> listBackups(@RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }
        return ResponseEntity.ok(settingService.getAllAdminSettings().get("backups"));
    }

    /**
     * Restore system snapshot.
     */
    @PostMapping("/api/admin/backups/{id}/restore")
    public ResponseEntity<?> restoreBackup(
            @PathVariable("id") Long backupId,
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Name", required = false) String userName) {

        if (!isAdmin(role)) {
            return accessDeniedResponse();
        }

        String password = payload.get("password");
        if (password == null || password.trim().isEmpty()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", "Administrator password is required to restore backups.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String adminName = userName != null ? userName : "Neema Joseph";
            boolean restored = settingService.restoreBackup(backupId, password, adminName);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", restored);
            response.put("message", "Backup restored successfully. Verified database availability.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("success", false);
            error.put("message", "Backup restoration failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    private boolean isAdmin(String role) {
        // If role header is absent in local testing, default to Administrator
        return role == null || "Administrator".equalsIgnoreCase(role) || "System Administrator".equalsIgnoreCase(role);
    }

    private ResponseEntity<?> accessDeniedResponse() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", false);
        res.put("status", 403);
        res.put("message", "Administrator permission is required.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(res);
    }
}
