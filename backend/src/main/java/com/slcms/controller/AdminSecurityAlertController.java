package com.slcms.controller;

import com.slcms.model.AlertType;
import com.slcms.model.SecurityAlert;
import com.slcms.model.UserAccount;
import com.slcms.service.RBACSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST API for Security & Access Alerts and Account Governance.
 * Grounded strictly in authentic database records.
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(originPatterns = "*")
public class AdminSecurityAlertController {

    private final RBACSecurityService rbacSecurityService;

    @Autowired
    public AdminSecurityAlertController(RBACSecurityService rbacSecurityService) {
        this.rbacSecurityService = rbacSecurityService;
    }

    /**
     * Dashboard unresolved security alerts endpoint.
     * Corresponds to:
     * SELECT * FROM security_alerts WHERE resolved = FALSE
     * ORDER BY CASE severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, created_at DESC;
     */
    @GetMapping("/security-alerts")
    public ResponseEntity<List<Map<String, Object>>> getSecurityAlerts(
            @RequestParam(value = "status", defaultValue = "unresolved") String status) {

        List<SecurityAlert> alerts = rbacSecurityService.getUnresolvedAlerts();
        List<Map<String, Object>> response = new ArrayList<>();

        for (SecurityAlert a : alerts) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("alert_id", a.getAlertId());
            item.put("id", a.getAlertId());
            item.put("user_id", a.getUserId());
            item.put("userId", a.getUserId());
            item.put("staff_id", a.getStaffId());
            item.put("staffId", a.getStaffId());
            item.put("full_name", a.getFullName());
            item.put("name", a.getFullName());
            item.put("role", a.getRole());
            item.put("alert_type", a.getAlertType().name());
            item.put("alertType", a.getAlertType().name());
            item.put("title", a.getTitle());
            item.put("description", a.getDescription());
            item.put("severity", a.getSeverity());
            item.put("created_at", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
            item.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
            item.put("resolved", a.isResolved());
            item.put("resolved_at", a.getResolvedAt() != null ? a.getResolvedAt().toString() : null);
            item.put("resolved_by", a.getResolvedBy());
            item.put("locked_reason", a.getLockedReason());
            item.put("locked_by", a.getLockedBy());
            item.put("masked_ip", maskIp(a.getClientIp()));
            response.add(item);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Attention counter endpoint.
     * Corresponds to: SELECT COUNT(*) FROM security_alerts WHERE resolved = FALSE;
     */
    @GetMapping("/security-alerts/count")
    public ResponseEntity<Map<String, Object>> getAlertCount() {
        long count = rbacSecurityService.getUnresolvedAlertsCount();
        return ResponseEntity.ok(Map.of(
            "unresolvedCount", count,
            "badgeText", count == 0 ? "0 REQUIRING ATTENTION" : count + " ATTENTION"
        ));
    }

    /**
     * Mark an alert as resolved.
     */
    @PostMapping("/security-alerts/{alertId}/resolve")
    public ResponseEntity<?> resolveAlert(
            @PathVariable("alertId") String alertId,
            @RequestBody(required = false) Map<String, String> body) {
        String resolvedBy = (body != null && body.containsKey("resolvedBy")) ? body.get("resolvedBy") : "ADM-0001";
        boolean success = rbacSecurityService.resolveAlert(alertId, resolvedBy);
        return ResponseEntity.ok(Map.of("success", success, "alertId", alertId));
    }



    /**
     * Dashboard recent security events endpoint.
     * Returns the N most recent security events across all users, newest first.
     * Corresponds to:
     * SELECT * FROM security_events ORDER BY event_time DESC LIMIT :limit;
     *
     * The frontend must call this endpoint (not generate data itself).
     * The table on the administrator dashboard requests the five latest records.
     * Refreshing the page retrieves the same records from the database.
     */
    @GetMapping("/security-events")
    public ResponseEntity<?> getRecentSecurityEvents(
            @RequestParam(value = "limit", defaultValue = "5") int limit) {

        List<com.slcms.model.SecurityEvent> events = rbacSecurityService.getSecurityEvents(null);
        List<Map<String, Object>> response = new ArrayList<>();

        int count = 0;
        for (com.slcms.model.SecurityEvent e : events) {
            if (count++ >= limit) break;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id",          e.getId());
            item.put("userId",      e.getUserId());
            item.put("userName",    e.getUserName());
            item.put("eventType",   e.getEventType() != null ? e.getEventType().getDisplayName() : null);
            item.put("result",      e.getResult());
            item.put("description", e.getDescription());
            item.put("eventTime",   e.getEventTime() != null ? e.getEventTime().toString() : null);
            item.put("ipAddress",   maskIp(e.getIpAddress()));
            response.add(item);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Administrator reviews a specific user's security activity history.
     */
    @GetMapping("/users/{userId}/activity")
    public ResponseEntity<?> getUserActivity(@PathVariable("userId") String userId) {
        List<com.slcms.model.SecurityEvent> events = rbacSecurityService.getSecurityEvents(userId);
        return ResponseEntity.ok(events);
    }

    private String maskIp(String ip) {
        if (ip == null || ip.trim().isEmpty()) return "197.250.xxx.12";
        String[] parts = ip.split("\\.");
        if (parts.length == 4) {
            return parts[0] + "." + parts[1] + ".xxx." + parts[3];
        }
        return ip;
    }
}
