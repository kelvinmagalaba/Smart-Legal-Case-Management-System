package com.slcms.controller;

import com.slcms.model.AccountStatus;
import com.slcms.model.UserAccount;
import com.slcms.model.UserRole;
import com.slcms.model.UserStatus;
import com.slcms.repository.UserRepository;
import com.slcms.service.RBACSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Enterprise Admin User Management REST API.
 * Connects directly to the permanent online database.
 */
@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(originPatterns = "*")
public class AdminUserController {

    private final UserRepository userRepository;
    private final RBACSecurityService rbacSecurityService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public AdminUserController(UserRepository userRepository,
                               RBACSecurityService rbacSecurityService,
                               PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.rbacSecurityService = rbacSecurityService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * GET /api/admin/users
     * Returns all registered staff accounts from the permanent online database.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllStaffUsers() {
        List<UserAccount> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (UserAccount u : users) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", u.getId());
            dto.put("staffId", u.getStaffId());
            dto.put("employeeId", u.getStaffId());
            dto.put("name", u.getName());
            dto.put("email", u.getEmail());
            dto.put("phone", u.getPhone());
            dto.put("role", u.getRole() != null ? u.getRole().getDisplayName() : "Lawyer");
            dto.put("roleKey", u.getRole() != null ? u.getRole().name() : "LAWYER");
            dto.put("roleTitle", u.getRoleTitle() != null ? u.getRoleTitle() : (u.getRole() != null ? u.getRole().getDisplayName() : "Staff"));
            dto.put("status", u.getStatus() != null ? u.getStatus().getDisplayName() : "Active");
            dto.put("accountStatus", u.getAccountStatus() != null ? u.getAccountStatus().name() : "ACTIVE");
            dto.put("department", u.getDepartment());
            dto.put("advocateNumber", u.getAdvocateNumber());
            dto.put("practisingCertNo", u.getPractisingCertNo());
            dto.put("mustChangePassword", u.isMustChangePassword());
            dto.put("adminLocked", u.isAdminLocked());
            dto.put("failedAttempts", u.getFailedAttempts());
            dto.put("lastLogin", u.getLastLogin() != null ? u.getLastLogin() : "Never");
            dto.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
            response.add(dto);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/admin/users
     * Administrator creates a new staff account (e.g. Lawyer) stored in the permanent database.
     */
    @PostMapping
    public ResponseEntity<?> createStaffUser(@RequestBody Map<String, Object> payload,
                                             @RequestHeader(value = "X-User-Role", required = false) String requesterRole) {

        // Check if requester role header exists and is not Administrator
        if (requesterRole != null && !requesterRole.trim().isEmpty() &&
            !"ADMINISTRATOR".equalsIgnoreCase(requesterRole.trim()) &&
            !"Administrator".equalsIgnoreCase(requesterRole.trim()) &&
            !"MANAGING_PARTNER".equalsIgnoreCase(requesterRole.trim())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Access denied: Administrator privileges required to provision staff."));
        }

        String fullName = (String) payload.get("fullName");
        if (fullName == null || fullName.trim().isEmpty()) {
            fullName = (String) payload.get("name");
        }
        String email = (String) payload.get("email");
        String phone = (String) payload.get("phone");
        String roleStr = (String) payload.get("role");
        String tempPassword = (String) payload.get("temporaryPassword");
        String staffId = (String) payload.get("staffId");
        String department = (String) payload.get("department");
        String advocateNumber = (String) payload.get("advocateNumber");

        if (fullName == null || fullName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Full Name is required."));
        }
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email address is required."));
        }

        final String cleanEmail = email.trim().toLowerCase();

        // Check unique email
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("success", false, "message", "An account with this email address already exists."));
        }

        // Check unique phone if provided
        if (phone != null && !phone.trim().isEmpty()) {
            if (userRepository.existsByPhone(phone.trim())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("success", false, "message", "An account with this phone number already exists."));
            }
        }

        // Determine user role
        UserRole userRole = UserRole.ASSOCIATE_LAWYER; // Default to Lawyer
        if (roleStr != null && !roleStr.trim().isEmpty()) {
            String r = roleStr.trim().toUpperCase().replace(" ", "_");
            if (r.contains("ADMIN")) {
                userRole = UserRole.ADMINISTRATOR;
            } else if (r.contains("SENIOR")) {
                userRole = UserRole.SENIOR_COUNSEL;
            } else if (r.contains("CLERK")) {
                userRole = UserRole.LEGAL_CLERK;
            } else if (r.contains("PARTNER")) {
                userRole = UserRole.MANAGING_PARTNER;
            } else {
                userRole = UserRole.ASSOCIATE_LAWYER;
            }
        }

        // Generate Staff ID if not provided
        if (staffId == null || staffId.trim().isEmpty()) {
            String prefix = (userRole == UserRole.ADMINISTRATOR) ? "ADM" :
                            (userRole == UserRole.SENIOR_COUNSEL || userRole == UserRole.ASSOCIATE_LAWYER) ? "LAW" :
                            (userRole == UserRole.LEGAL_CLERK) ? "CLK" : "STF";
            int num = 1000 + random.nextInt(9000);
            staffId = prefix + "-" + num;
            while (userRepository.existsByStaffIdIgnoreCase(staffId)) {
                num = 1000 + random.nextInt(9000);
                staffId = prefix + "-" + num;
            }
        } else {
            staffId = staffId.trim().toUpperCase();
            if (userRepository.existsByStaffIdIgnoreCase(staffId)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("success", false, "message", "An account with Staff ID '" + staffId + "' already exists."));
            }
        }

        // Generate secure temporary password if not provided
        if (tempPassword == null || tempPassword.trim().isEmpty()) {
            tempPassword = "SLCMS#" + (100000 + random.nextInt(900000)) + "!";
        }

        // Hash temporary password with BCrypt
        String hashedPass = passwordEncoder.encode(tempPassword);

        UserAccount newUser = new UserAccount();
        newUser.setId("usr-" + UUID.randomUUID().toString().substring(0, 8));
        newUser.setStaffId(staffId);
        newUser.setEmployeeId(staffId);
        newUser.setName(fullName.trim());
        newUser.setEmail(cleanEmail);
        newUser.setPhone(phone != null ? phone.trim() : "+255 754 000 000");
        newUser.setPasswordHash(hashedPass);
        newUser.setRole(userRole);
        newUser.setRoleTitle(userRole.getDisplayName());
        newUser.setStatus(UserStatus.FIRST_LOGIN_PENDING);
        newUser.setAccountStatus(AccountStatus.FIRST_LOGIN_RESET);
        newUser.setMustChangePassword(true);
        newUser.setFirstLoginRequired(true);
        newUser.setTemporaryPasswordExpiresAt(LocalDateTime.now().plusHours(24));
        newUser.setDepartment(department != null && !department.trim().isEmpty() ? department.trim() : "Commercial Litigation");
        newUser.setAdvocateNumber(advocateNumber);
        newUser.setCreatedAt(LocalDateTime.now());
        newUser.setFailedAttempts(0);
        newUser.setFailedLoginAttempts(0);

        UserAccount savedUser = userRepository.save(newUser);

        // Record security audit event
        rbacSecurityService.recordSecurityEvent(new com.slcms.model.SecurityEvent(
                "evt-" + System.currentTimeMillis(), savedUser.getId(), savedUser.getName(),
                com.slcms.model.EventType.USER_MANAGEMENT, "Created",
                "Staff account provisioned for " + savedUser.getName() + " (" + savedUser.getStaffId() + ") as " + userRole.getDisplayName(),
                "127.0.0.1"
        ));

        Map<String, Object> userDTO = new LinkedHashMap<>();
        userDTO.put("id", savedUser.getId());
        userDTO.put("staffId", savedUser.getStaffId());
        userDTO.put("name", savedUser.getName());
        userDTO.put("email", savedUser.getEmail());
        userDTO.put("phone", savedUser.getPhone());
        userDTO.put("role", savedUser.getRole().getDisplayName());
        userDTO.put("roleKey", savedUser.getRole().name());
        userDTO.put("accountStatus", savedUser.getAccountStatus().name());
        userDTO.put("status", savedUser.getStatus().getDisplayName());
        userDTO.put("mustChangePassword", savedUser.isMustChangePassword());
        userDTO.put("department", savedUser.getDepartment());
        userDTO.put("createdAt", savedUser.getCreatedAt().toString());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Staff account successfully created and saved to permanent database.",
                "user", userDTO,
                "temporaryPassword", tempPassword,
                "staffId", savedUser.getStaffId()
        ));
    }

    /**
     * POST /api/admin/users/{userId}/lock
     */
    @PostMapping("/{userId}/lock")
    public ResponseEntity<?> lockUser(@PathVariable("userId") String userId,
                                      @RequestBody(required = false) Map<String, String> body) {
        String reason = (body != null && body.containsKey("reason")) ? body.get("reason") : "Administrative decision";
        boolean ok = rbacSecurityService.lockUser(userId, reason, true, "Administrator");
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "User account locked"));
    }

    /**
     * POST /api/admin/users/{userId}/unlock
     */
    @PostMapping("/{userId}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable("userId") String userId) {
        boolean ok = rbacSecurityService.unlockAccount(userId, "Administrative manual unlock", "Administrator", false);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "User account unlocked"));
    }

    /**
     * POST /api/admin/users/{userId}/reset-password
     */
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable("userId") String userId) {
        String newTemp = "TempPass" + (1000 + random.nextInt(9000)) + "!";
        boolean ok = rbacSecurityService.resetUserPassword(userId, newTemp, "Administrator");
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "temporaryPassword", newTemp, "message", "Password reset successfully"));
    }

    /**
     * DELETE /api/admin/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable("userId") String userId) {
        if ("usr-001".equalsIgnoreCase(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Root administrator cannot be deleted"));
        }
        boolean ok = rbacSecurityService.deleteUser(userId, "Administrator");
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "User deleted successfully"));
    }
}
