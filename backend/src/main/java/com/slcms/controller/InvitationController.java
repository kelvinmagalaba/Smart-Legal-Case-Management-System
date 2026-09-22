package com.slcms.controller;

import com.slcms.dto.AccessDeniedResponse;
import com.slcms.model.AccountStatus;
import com.slcms.model.Invitation;
import com.slcms.model.UserAccount;
import com.slcms.model.UserRole;
import com.slcms.service.RBACSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/invitations")
@CrossOrigin(originPatterns = "*")
public class InvitationController {

    private final RBACSecurityService securityService;

    // Simulated repository of invitations
    private static final List<Invitation> INVITATIONS = new ArrayList<>();

    static {
        // Valid Senior Counsel Invitation
        INVITATIONS.add(new Invitation(
                "inv-001",
                "INV-TZ-2026-SR-COUNSEL",
                "Adv. Robert Kasoma",
                UserRole.SENIOR_COUNSEL,
                "EMP-1011",
                "ADV/2026/0481",
                "PC-TZ-2026-8812",
                null,
                "r.kasoma@slcms-law.com",
                "+255 754 112 233",
                "Commercial Litigation",
                LocalDateTime.now().plusDays(14),
                "PENDING",
                "usr-001",
                LocalDateTime.now()
        ));

        // Valid Associate Lawyer Invitation
        INVITATIONS.add(new Invitation(
                "inv-002",
                "INV-TZ-2026-ASSOC",
                "Adv. Neema Mwangi",
                UserRole.ASSOCIATE_LAWYER,
                "EMP-1012",
                "ADV/2026/0920",
                "PC-TZ-2026-4401",
                null,
                "n.mwangi@slcms-law.com",
                "+255 765 223 344",
                "Intellectual Property",
                LocalDateTime.now().plusDays(7),
                "PENDING",
                "usr-001",
                LocalDateTime.now()
        ));

        // Valid Legal Clerk Invitation (Uses National ID Ref)
        INVITATIONS.add(new Invitation(
                "inv-003",
                "INV-TZ-2026-CLERK",
                "Gabriel Mushi",
                UserRole.LEGAL_CLERK,
                "EMP-1013",
                null,
                null,
                "NIDA-19940812-1002-88",
                "g.mushi@slcms-law.com",
                "+255 784 334 455",
                "Court Filings & Registry",
                LocalDateTime.now().plusDays(10),
                "PENDING",
                "usr-001",
                LocalDateTime.now()
        ));

        // Expired Invitation (For rejection testing)
        INVITATIONS.add(new Invitation(
                "inv-004",
                "INV-EXPIRED-TEST",
                "Daniel Tarimo",
                UserRole.JUNIOR_LAWYER,
                "EMP-1014",
                "ADV/2025/1102",
                null,
                null,
                "d.tarimo@slcms-law.com",
                "+255 713 445 566",
                "Corporate Advisory",
                LocalDateTime.now().minusDays(5),
                "PENDING",
                "usr-001",
                LocalDateTime.now().minusDays(30)
        ));

        // Used Invitation (For rejection testing)
        INVITATIONS.add(new Invitation(
                "inv-005",
                "INV-USED-TEST",
                "Sarah Kimaro",
                UserRole.ASSOCIATE_LAWYER,
                "EMP-1015",
                "ADV/2025/0743",
                null,
                null,
                "s.kimaro@slcms-law.com",
                "+255 712 556 677",
                "Litigation",
                LocalDateTime.now().plusDays(3),
                "USED",
                "usr-001",
                LocalDateTime.now().minusDays(1)
        ));
    }

    @Autowired
    public InvitationController(RBACSecurityService securityService) {
        this.securityService = securityService;
    }

    @GetMapping
    public ResponseEntity<List<Invitation>> listInvitations(@RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(INVITATIONS);
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateInvitation(@RequestBody Map<String, String> body) {
        String code = body.get("invitationCode");
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("valid", false, "message", "Registration denied. This invitation is invalid, expired or already used."));
        }

        String cleanCode = code.trim().toUpperCase();
        Optional<Invitation> invOpt = INVITATIONS.stream()
                .filter(i -> i.getInvitationCode().equalsIgnoreCase(cleanCode))
                .findFirst();

        if (invOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("valid", false, "message", "Registration denied. This invitation is invalid, expired or already used."));
        }

        Invitation inv = invOpt.get();
        if (!inv.isValid()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("valid", false, "message", "Registration denied. This invitation is invalid, expired or already used."));
        }

        // Return pre-approved details (Role is locked and immutable)
        Map<String, Object> response = new HashMap<>();
        response.put("valid", true);
        response.put("invitationCode", inv.getInvitationCode());
        response.put("approvedFullName", inv.getApprovedFullName());
        response.put("approvedRole", inv.getApprovedRole().name());
        response.put("approvedRoleTitle", inv.getApprovedRole().getDisplayName());
        response.put("staffId", inv.getStaffId());
        response.put("advocateNumber", inv.getAdvocateNumber());
        response.put("practisingCertNo", inv.getPractisingCertNo());
        response.put("nationalIdRefMasked", inv.getNationalIdRef() != null ? "NID-••••-" + inv.getNationalIdRef().substring(Math.max(0, inv.getNationalIdRef().length() - 4)) : null);
        response.put("approvedEmail", inv.getApprovedEmail());
        response.put("approvedPhone", inv.getApprovedPhone());
        response.put("department", inv.getDepartment());
        response.put("expirationDate", inv.getExpirationDate().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerWithInvitation(@RequestBody Map<String, String> body) {
        String code = body.get("invitationCode");
        String email = body.get("email");
        String phone = body.get("phone");
        String staffId = body.get("staffId");
        String advocateNumber = body.get("advocateNumber");
        String nationalIdRef = body.get("nationalIdRef");
        String password = body.get("password");

        // 1. Validate Invitation Presence & Status
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Registration denied. This invitation is invalid, expired or already used."));
        }

        Optional<Invitation> invOpt = INVITATIONS.stream()
                .filter(i -> i.getInvitationCode().equalsIgnoreCase(code.trim()))
                .findFirst();

        if (invOpt.isEmpty() || !invOpt.get().isValid()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Registration denied. This invitation is invalid, expired or already used."));
        }

        Invitation inv = invOpt.get();

        // 2. Strict Professional Identity Matching
        if (email != null && !email.trim().equalsIgnoreCase(inv.getApprovedEmail())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Registration denied. The submitted professional information does not match the role assigned by the organization."));
        }

        if (staffId != null && !staffId.trim().equalsIgnoreCase(inv.getStaffId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Registration denied. The submitted professional information does not match the role assigned by the organization."));
        }

        if (inv.getAdvocateNumber() != null && advocateNumber != null &&
                !advocateNumber.trim().equalsIgnoreCase(inv.getAdvocateNumber())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Registration denied. The submitted professional information does not match the role assigned by the organization."));
        }

        // 3. Mark Invitation As Used
        inv.setStatus("USED");

        // 4. Create User Account in Active / First Login State
        UserAccount newUser = new UserAccount(
                "usr-" + UUID.randomUUID().toString().substring(0, 8),
                inv.getStaffId(),
                inv.getApprovedFullName(),
                inv.getApprovedEmail(),
                password,
                inv.getApprovedRole(),
                inv.getApprovedRole().getDisplayName(),
                AccountStatus.ACTIVE,
                inv.getDepartment(),
                inv.getAdvocateNumber(),
                false,
                Arrays.asList("case-101")
        );
        newUser.setPhone(inv.getApprovedPhone());
        newUser.setPractisingCertNo(inv.getPractisingCertNo());
        newUser.setNationalIdRef(inv.getNationalIdRef());
        newUser.setInvitationId(inv.getId());
        newUser.setApprovedBy(inv.getCreatedById());
        newUser.setApprovedAt(LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Registration complete. Account is now active with verified professional credentials.",
                "user", newUser
        ));
    }
}
