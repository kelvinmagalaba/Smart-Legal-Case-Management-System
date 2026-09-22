package com.slcms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Entity representing an authenticated or provisioned user in SLCMS.
 * Mapped to the persistent 'users' table in PostgreSQL / MySQL / H2.
 */
@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "staff_id", length = 50, unique = true, nullable = false)
    private String staffId;

    @Column(name = "employee_id", length = 50)
    private String employeeId;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "email", length = 150, unique = true, nullable = false)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Transient
    @JsonIgnore
    private String passwordPlain;

    @Column(name = "password_hash", length = 255, nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 50, nullable = false)
    private UserRole role;

    @Column(name = "role_title", length = 100)
    private String roleTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private UserStatus status; // Legacy compatibility

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", length = 50, nullable = false)
    private AccountStatus accountStatus; // PENDING_VERIFICATION, PENDING_APPROVAL, ACTIVE, FIRST_LOGIN_RESET, LOCKED, SUSPENDED, DEACTIVATED

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "bar_number", length = 50)
    private String barNumber;

    @Column(name = "advocate_number", length = 50)
    private String advocateNumber;

    @Column(name = "practising_cert_no", length = 50)
    private String practisingCertNo;

    @Column(name = "national_id_ref", length = 50)
    private String nationalIdRef;

    @Column(name = "identity_verification_status", length = 50)
    private String identityVerificationStatus; // VERIFIED, PENDING_REVIEW, REJECTED

    @Column(name = "invitation_id", length = 50)
    private String invitationId;

    @Column(name = "approved_by", length = 50)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "avatar_img", length = 500)
    private String avatarImg;

    @Column(name = "must_change_password")
    private boolean mustChangePassword;

    @Column(name = "failed_attempts")
    private int failedAttempts;

    @Column(name = "failed_login_attempts")
    private int failedLoginAttempts;

    @Column(name = "first_login_required")
    private boolean firstLoginRequired;

    @Column(name = "temporary_password_expires_at")
    private LocalDateTime temporaryPasswordExpiresAt;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "locked_until")
    private Long lockedUntil;

    @Column(name = "locked_by", length = 50)
    private String lockedBy;

    @Column(name = "locked_reason", length = 100)
    private String lockedReason;

    @Column(name = "admin_locked")
    private boolean adminLocked;

    @Column(name = "last_successful_login")
    private LocalDateTime lastSuccessfulLogin;

    @Column(name = "last_failed_login")
    private LocalDateTime lastFailedLogin;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @Column(name = "last_login", length = 50)
    private String lastLogin;

    @Transient
    private List<String> assignedCaseIds = new ArrayList<>();

    public UserAccount() {}

    public UserAccount(String id, String staffId, String name, String email, String passwordPlain, 
                       UserRole role, String roleTitle, AccountStatus accountStatus, String department, 
                       String advocateNumber, boolean mustChangePassword, List<String> assignedCaseIds) {
        this.id = id;
        this.staffId = staffId;
        this.employeeId = staffId;
        this.name = name;
        this.email = email;
        this.passwordPlain = passwordPlain;
        this.role = role;
        this.roleTitle = roleTitle;
        this.accountStatus = accountStatus;
        this.status = (accountStatus == AccountStatus.ACTIVE) ? UserStatus.ACTIVE :
                      (accountStatus == AccountStatus.LOCKED) ? UserStatus.LOCKED :
                      (accountStatus == AccountStatus.DEACTIVATED) ? UserStatus.DEACTIVATED :
                      (accountStatus == AccountStatus.FIRST_LOGIN_RESET) ? UserStatus.FIRST_LOGIN_PENDING : UserStatus.ACTIVE;
        this.department = department;
        this.advocateNumber = advocateNumber;
        this.barNumber = advocateNumber;
        this.mustChangePassword = mustChangePassword;
        this.failedAttempts = 0;
        this.lockedUntil = null;
        this.lastLogin = "Never";
        this.identityVerificationStatus = "VERIFIED";
        this.createdAt = LocalDateTime.now();
        if (assignedCaseIds != null) {
            this.assignedCaseIds = new ArrayList<>(assignedCaseIds);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStaffId() { return staffId != null ? staffId : employeeId; }
    public void setStaffId(String staffId) { this.staffId = staffId; this.employeeId = staffId; }

    public String getEmployeeId() { return employeeId != null ? employeeId : staffId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; this.staffId = employeeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPasswordPlain() { return passwordPlain; }
    public void setPasswordPlain(String passwordPlain) { this.passwordPlain = passwordPlain; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public String getRoleTitle() { return roleTitle; }
    public void setRoleTitle(String roleTitle) { this.roleTitle = roleTitle; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public AccountStatus getAccountStatus() { return accountStatus; }
    public void setAccountStatus(AccountStatus accountStatus) { this.accountStatus = accountStatus; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getBarNumber() { return barNumber; }
    public void setBarNumber(String barNumber) { this.barNumber = barNumber; }

    public String getAdvocateNumber() { return advocateNumber; }
    public void setAdvocateNumber(String advocateNumber) { this.advocateNumber = advocateNumber; }

    public String getPractisingCertNo() { return practisingCertNo; }
    public void setPractisingCertNo(String practisingCertNo) { this.practisingCertNo = practisingCertNo; }

    public String getNationalIdRef() { return nationalIdRef; }
    public void setNationalIdRef(String nationalIdRef) { this.nationalIdRef = nationalIdRef; }

    public String getIdentityVerificationStatus() { return identityVerificationStatus; }
    public void setIdentityVerificationStatus(String identityVerificationStatus) { this.identityVerificationStatus = identityVerificationStatus; }

    public String getInvitationId() { return invitationId; }
    public void setInvitationId(String invitationId) { this.invitationId = invitationId; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getAvatarImg() { return avatarImg; }
    public void setAvatarImg(String avatarImg) { this.avatarImg = avatarImg; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { 
        this.failedAttempts = failedAttempts; 
        this.failedLoginAttempts = failedAttempts;
    }

    public int getFailedLoginAttempts() { return failedLoginAttempts > 0 ? failedLoginAttempts : failedAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { 
        this.failedLoginAttempts = failedLoginAttempts; 
        this.failedAttempts = failedLoginAttempts;
    }

    public boolean isFirstLoginRequired() { return firstLoginRequired; }
    public void setFirstLoginRequired(boolean firstLoginRequired) { this.firstLoginRequired = firstLoginRequired; }

    public LocalDateTime getTemporaryPasswordExpiresAt() { return temporaryPasswordExpiresAt; }
    public void setTemporaryPasswordExpiresAt(LocalDateTime temporaryPasswordExpiresAt) { this.temporaryPasswordExpiresAt = temporaryPasswordExpiresAt; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }

    public Long getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Long lockedUntil) { this.lockedUntil = lockedUntil; }

    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String lockedBy) { this.lockedBy = lockedBy; }

    public String getLockedReason() { return lockedReason; }
    public void setLockedReason(String lockedReason) { this.lockedReason = lockedReason; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public LocalDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(LocalDateTime passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }

    public String getLastLogin() { return lastLogin; }
    public void setLastLogin(String lastLogin) { this.lastLogin = lastLogin; }

    public List<String> getAssignedCaseIds() { return assignedCaseIds; }
    public void setAssignedCaseIds(List<String> assignedCaseIds) { this.assignedCaseIds = assignedCaseIds; }

    public boolean isAdminLocked() { return adminLocked; }
    public void setAdminLocked(boolean adminLocked) { this.adminLocked = adminLocked; }

    public LocalDateTime getLastSuccessfulLogin() { return lastSuccessfulLogin; }
    public void setLastSuccessfulLogin(LocalDateTime lastSuccessfulLogin) { 
        this.lastSuccessfulLogin = lastSuccessfulLogin; 
        this.lastLoginAt = lastSuccessfulLogin;
    }

    public LocalDateTime getLastFailedLogin() { return lastFailedLogin; }
    public void setLastFailedLogin(LocalDateTime lastFailedLogin) { this.lastFailedLogin = lastFailedLogin; }
}
