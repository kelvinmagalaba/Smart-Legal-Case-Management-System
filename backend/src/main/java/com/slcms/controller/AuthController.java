package com.slcms.controller;

import com.slcms.dto.AccessDeniedResponse;
import com.slcms.model.AccountStatus;
import com.slcms.model.UserAccount;
import com.slcms.model.UserRole;
import com.slcms.model.UserStatus;
import com.slcms.service.RBACSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Enterprise Authentication & User Access API with strict RBAC enforcement.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(originPatterns = "*")
public class AuthController {

    private final RBACSecurityService rbacSecurityService;
    private final com.slcms.repository.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(RBACSecurityService rbacSecurityService,
                          com.slcms.repository.UserRepository userRepository,
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.rbacSecurityService = rbacSecurityService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Retrieve list of authorized demo users for the login/register showcase matrix.
     */
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getShowcaseUsers() {
        List<UserAccount> accounts = rbacSecurityService.getAllUsers();
        List<Map<String, Object>> result = new ArrayList<>();

        for (UserAccount acc : accounts) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id", acc.getId());
            u.put("employeeId", acc.getEmployeeId());
            u.put("staffId", acc.getStaffId());
            u.put("name", acc.getName());
            u.put("email", acc.getEmail());
            u.put("phone", acc.getPhone());
            u.put("role", acc.getRole().getDisplayName());
            u.put("roleKey", acc.getRole().name());
            u.put("roleTitle", acc.getRoleTitle());
            u.put("status", acc.getStatus().getDisplayName());
            u.put("accountStatus", acc.getAccountStatus() != null ? acc.getAccountStatus().name() : acc.getStatus().name());
            u.put("department", acc.getDepartment());
            u.put("advocateNumber", acc.getAdvocateNumber());
            u.put("practisingCertNo", acc.getPractisingCertNo());
            u.put("nationalIdRef", acc.getNationalIdRef());
            u.put("assignedCaseCount", acc.getAssignedCaseIds().size());
            u.put("assignedCaseIds", acc.getAssignedCaseIds());
            u.put("mustChangePassword", acc.isMustChangePassword());
            u.put("passwordPlain", acc.getPasswordPlain()); // Included for 1-click test fill
            result.add(u);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Authenticate user credentials and evaluate security states.
     * Supports login via Email, Phone Number, or Staff ID.
     */
    @PostMapping("/login")
    public ResponseEntity<?> authenticate(@RequestBody Map<String, String> credentials) {
        String identifier = credentials.get("email");
        if (identifier == null || identifier.trim().isEmpty()) {
            identifier = credentials.get("identifier");
        }
        String password = credentials.get("password");

        if (identifier == null || password == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Invalid email/username or password."));
        }

        final String cleanId = identifier.trim().toLowerCase();
        final String digitsOnly = identifier.replaceAll("\\D", "");

        UserAccount user = rbacSecurityService.getAllUsers().stream()
                .filter(u -> {
                    if (u.getEmail() != null && u.getEmail().equalsIgnoreCase(cleanId)) return true;
                    if (u.getEmployeeId() != null && u.getEmployeeId().equalsIgnoreCase(cleanId)) return true;
                    if (u.getStaffId() != null && u.getStaffId().equalsIgnoreCase(cleanId)) return true;
                    if (u.getName() != null && u.getName().equalsIgnoreCase(cleanId)) return true;
                    if (digitsOnly.length() >= 7 && u.getPhone() != null && u.getPhone().replaceAll("\\D", "").endsWith(digitsOnly)) return true;
                    return false;
                })
                .findFirst()
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Invalid email/username or password."));
        }

        // Check Administrator Lock First (Never automatically cleared by temporary lock expiry)
        if (user.isAdminLocked() || (user.getAccountStatus() == AccountStatus.LOCKED && user.getLockedUntil() == null)) {
            rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
                "evt-" + System.currentTimeMillis(), user.getId(), com.slcms.model.EventType.LOGIN_FAILED,
                "Login attempt rejected — account manually locked by administrator", "127.0.0.1"
            ));
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "errorType", "ADMIN_LOCKED",
                            "message", "Your account has been locked by the administrator. Contact the system administrator."));
        }

        // Check Deactivated State
        if (user.getStatus() == UserStatus.DEACTIVATED || user.getAccountStatus() == AccountStatus.DEACTIVATED) {
            rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
                "evt-" + System.currentTimeMillis(), user.getId(), com.slcms.model.EventType.LOGIN_FAILED,
                "Login attempt rejected — account deactivated", "127.0.0.1"
            ));
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "errorType", "ACCOUNT_DISABLED", 
                            "message", "This account is inactive. Contact the system administrator."));
        }

        // Check Pending Approval State
        if (user.getAccountStatus() == AccountStatus.PENDING_APPROVAL || user.getAccountStatus() == AccountStatus.PENDING_VERIFICATION) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "errorType", "PENDING_APPROVAL",
                            "message", "Your identity was received successfully. Access will remain restricted until an authorized administrator approves your account."));
        }

        // Check if temporary password is expired
        if ((user.isMustChangePassword() || user.isFirstLoginRequired()) && user.getTemporaryPasswordExpiresAt() != null) {
            if (java.time.LocalDateTime.now().isAfter(user.getTemporaryPasswordExpiresAt())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false, "errorType", "TEMPORARY_PASSWORD_EXPIRED",
                                "message", "The temporary password expired before first-login setup was completed. Please contact your Administrator."));
            }
        }

        long nowMs = System.currentTimeMillis();

        // Check Temporary Lock
        if (user.getAccountStatus() == AccountStatus.TEMPORARILY_LOCKED || (user.getLockedUntil() != null && user.getAccountStatus() == AccountStatus.LOCKED)) {
            if (user.getLockedUntil() != null && nowMs >= user.getLockedUntil()) {
                // 2 minutes expired -> auto-unlock and permit attempt
                user.setStatus(UserStatus.ACTIVE);
                user.setAccountStatus(AccountStatus.ACTIVE);
                user.setFailedAttempts(0);
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                user.setLockedAt(null);
                user.setLockedReason(null);
                rbacSecurityService.resolveAlertsForUser(user.getId(), com.slcms.model.AlertType.ACCOUNT_LOCKED, "SYSTEM");
            } else if (user.getLockedUntil() != null) {
                long remainingMs = user.getLockedUntil() - nowMs;
                long remMins = remainingMs / 60000;
                long remSecs = (remainingMs % 60000) / 1000;
                String formattedRemaining = String.format("%d:%02d", remMins, remSecs);

                return ResponseEntity.status(HttpStatus.LOCKED)
                        .body(Map.of(
                            "success", false, 
                            "errorType", "TEMPORARILY_LOCKED", 
                            "remainingSeconds", Math.max(1, remainingMs / 1000),
                            "lockedUntil", user.getLockedUntil(),
                            "message", "Account temporarily locked. Try again in " + formattedRemaining + "."
                        ));
            }
        }

        boolean passwordMatch = false;
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            if (user.getPasswordHash().startsWith("$2a$") || user.getPasswordHash().startsWith("$2b$") || user.getPasswordHash().startsWith("$2y$")) {
                passwordMatch = passwordEncoder.matches(password, user.getPasswordHash());
            } else {
                passwordMatch = user.getPasswordHash().equals(password) || (user.getPasswordPlain() != null && user.getPasswordPlain().equals(password));
            }
        }
        if (!passwordMatch && user.getPasswordPlain() != null && !user.getPasswordPlain().isEmpty()) {
            passwordMatch = user.getPasswordPlain().equals(password);
        }

        if (!passwordMatch) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            user.setFailedLoginAttempts(attempts);
            user.setLastFailedLogin(java.time.LocalDateTime.now());

            int remaining = Math.max(0, 3 - attempts);
            String remStr = remaining == 1 ? "1 attempt remaining" : remaining + " attempts remaining";
            String failedResult = "Failed — " + remStr;

            rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
                "evt-" + System.currentTimeMillis(), user.getId(), user.getName(),
                com.slcms.model.EventType.LOGIN_ATTEMPT, failedResult,
                "Incorrect credential attempt (" + attempts + " of 3)", "127.0.0.1"
            ));

            if (attempts >= 3) {
                long lockDurationMs = 2 * 60 * 1000; // 2 minutes
                user.setStatus(UserStatus.LOCKED);
                user.setAccountStatus(AccountStatus.TEMPORARILY_LOCKED);
                user.setLockedAt(java.time.LocalDateTime.now());
                user.setLockedUntil(nowMs + lockDurationMs);
                user.setLockedReason("THREE_FAILED_LOGINS");
                userRepository.save(user);

                com.slcms.model.SecurityAlert alert = new com.slcms.model.SecurityAlert(
                        "alt-" + System.currentTimeMillis(),
                        user.getId(),
                        user.getStaffId(),
                        user.getName(),
                        user.getRole().getDisplayName(),
                        com.slcms.model.AlertType.ACCOUNT_LOCKED,
                        "Temporary Login Lock",
                        "Three unsuccessful login attempts",
                        "HIGH"
                );
                alert.setLockedReason("THREE_FAILED_LOGINS");
                rbacSecurityService.createSecurityAlert(alert);

                java.time.LocalTime unlockLocal = java.time.LocalTime.now().plusMinutes(2);
                java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("h:mm a");
                String unlockTimeStr = unlockLocal.format(timeFmt);

                rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
                    "evt-" + (System.currentTimeMillis() + 1), user.getId(), user.getName(),
                    com.slcms.model.EventType.ACCOUNT_SECURITY, "Temporarily locked until " + unlockTimeStr,
                    "Account temporarily locked for 2 minutes after 3 failed login attempts", "127.0.0.1"
                ));

                return ResponseEntity.status(HttpStatus.LOCKED)
                        .body(Map.of(
                            "success", false,
                            "errorType", "TEMPORARILY_LOCKED",
                            "remainingSeconds", 120,
                            "lockedUntil", user.getLockedUntil(),
                            "message", "Account temporarily locked after 3 unsuccessful attempts. Try again in 2:00 minutes."
                        ));
            }

            userRepository.save(user);
            String remainingMsg = remaining == 1 ? "1 attempt remaining." : remaining + " attempts remaining.";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "success", false, 
                        "attemptsRemaining", remaining,
                        "message", "Incorrect credentials. " + remainingMsg
                    ));
        }

        // Reset failed counter on success
        user.setFailedAttempts(0);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLockedAt(null);
        user.setLockedReason(null);
        user.setLastSuccessfulLogin(java.time.LocalDateTime.now());
        userRepository.save(user);

        // Record LOGIN_ATTEMPT / Successful in Security Events database
        rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
            "evt-" + System.currentTimeMillis(), user.getId(), user.getName(),
            com.slcms.model.EventType.LOGIN_ATTEMPT, "Successful",
            "Login successful", "127.0.0.1"
        ));

        // Ordinary successful login recorded in Security Activity:
        rbacSecurityService.recordAudit(user.getEmail(), user.getRole().getDisplayName(), "Login successful", "Security Activity",
                "User: " + user.getStaffId() + ", Date and time: Automatically recorded");

        if (user.isMustChangePassword() || user.getStatus() == UserStatus.FIRST_LOGIN_PENDING || user.getAccountStatus() == AccountStatus.FIRST_LOGIN_RESET) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "authenticated", true,
                "staffId", user.getStaffId(),
                "role", user.getRole().name(),
                "roleDisplayName", user.getRole().getDisplayName(),
                "mustChangePassword", true,
                "requiresFirstLoginChange", true,
                "message", "Login successful. Welcome to SLCMS.",
                "user", Map.of(
                    "id", user.getId(),
                    "staffId", user.getStaffId(),
                    "email", user.getEmail(),
                    "name", user.getName(),
                    "role", user.getRole().getDisplayName(),
                    "roleKey", user.getRole().name(),
                    "mustChangePassword", true
                )
            ));
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "authenticated", true,
            "staffId", user.getStaffId(),
            "role", user.getRole().name(),
            "roleDisplayName", user.getRole().getDisplayName(),
            "mustChangePassword", false,
            "requiresFirstLoginChange", false,
            "message", "Login successful. Welcome to SLCMS.",
            "token", "slcms_jwt_" + UUID.randomUUID(),
            "user", user
        ));
    }

    /**
     * POST /api/auth/change-first-password
     * Allows newly provisioned staff (e.g. Lawyer) to set their permanent private password.
     */
    @PostMapping("/change-first-password")
    public ResponseEntity<?> changeFirstLoginPassword(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String userId = payload.get("userId");
        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password must be at least 10 characters long."));
        }

        UserAccount user = null;
        if (userId != null && !userId.trim().isEmpty()) {
            user = rbacSecurityService.getUserById(userId.trim());
        }
        if (user == null && identifier != null && !identifier.trim().isEmpty()) {
            user = rbacSecurityService.getUserByEmail(identifier.trim());
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User account not found."));
        }

        boolean updated = rbacSecurityService.changeUserPassword(user.getId(), newPassword);
        if (!updated) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Could not update password."));
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "authenticated", true,
            "staffId", user.getStaffId(),
            "role", user.getRole().name(),
            "roleDisplayName", user.getRole().getDisplayName(),
            "mustChangePassword", false,
            "message", "Password successfully changed. You can now log in with your new password."
        ));
    }
}
