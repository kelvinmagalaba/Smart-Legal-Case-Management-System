package com.slcms.model;

import java.time.LocalDateTime;

public class Invitation {
    private String id;
    private String invitationCode;
    private String approvedFullName;
    private UserRole approvedRole;
    private String staffId;
    private String advocateNumber;
    private String practisingCertNo;
    private String nationalIdRef;
    private String approvedEmail;
    private String approvedPhone;
    private String department;
    private LocalDateTime expirationDate;
    private String status; // PENDING, USED, EXPIRED, REVOKED
    private String createdById;
    private LocalDateTime createdAt;

    public Invitation() {}

    public Invitation(String id, String invitationCode, String approvedFullName, UserRole approvedRole,
                      String staffId, String advocateNumber, String practisingCertNo, String nationalIdRef,
                      String approvedEmail, String approvedPhone, String department, LocalDateTime expirationDate,
                      String status, String createdById, LocalDateTime createdAt) {
        this.id = id;
        this.invitationCode = invitationCode;
        this.approvedFullName = approvedFullName;
        this.approvedRole = approvedRole;
        this.staffId = staffId;
        this.advocateNumber = advocateNumber;
        this.practisingCertNo = practisingCertNo;
        this.nationalIdRef = nationalIdRef;
        this.approvedEmail = approvedEmail;
        this.approvedPhone = approvedPhone;
        this.department = department;
        this.expirationDate = expirationDate;
        this.status = status;
        this.createdById = createdById;
        this.createdAt = createdAt;
    }

    public boolean isValid() {
        return "PENDING".equalsIgnoreCase(this.status) &&
                (this.expirationDate == null || this.expirationDate.isAfter(LocalDateTime.now()));
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInvitationCode() { return invitationCode; }
    public void setInvitationCode(String invitationCode) { this.invitationCode = invitationCode; }

    public String getApprovedFullName() { return approvedFullName; }
    public void setApprovedFullName(String approvedFullName) { this.approvedFullName = approvedFullName; }

    public UserRole getApprovedRole() { return approvedRole; }
    public void setApprovedRole(UserRole approvedRole) { this.approvedRole = approvedRole; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }

    public String getAdvocateNumber() { return advocateNumber; }
    public void setAdvocateNumber(String advocateNumber) { this.advocateNumber = advocateNumber; }

    public String getPractisingCertNo() { return practisingCertNo; }
    public void setPractisingCertNo(String practisingCertNo) { this.practisingCertNo = practisingCertNo; }

    public String getNationalIdRef() { return nationalIdRef; }
    public void setNationalIdRef(String nationalIdRef) { this.nationalIdRef = nationalIdRef; }

    public String getApprovedEmail() { return approvedEmail; }
    public void setApprovedEmail(String approvedEmail) { this.approvedEmail = approvedEmail; }

    public String getApprovedPhone() { return approvedPhone; }
    public void setApprovedPhone(String approvedPhone) { this.approvedPhone = approvedPhone; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public LocalDateTime getExpirationDate() { return expirationDate; }
    public void setExpirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedById() { return createdById; }
    public void setCreatedById(String createdById) { this.createdById = createdById; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
