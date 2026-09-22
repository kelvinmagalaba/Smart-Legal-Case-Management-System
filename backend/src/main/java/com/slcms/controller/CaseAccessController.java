package com.slcms.controller;

import com.slcms.dto.AccessDeniedResponse;
import com.slcms.dto.CaseListResponse;
import com.slcms.model.DocumentSensitivity;
import com.slcms.model.UserAccount;
import com.slcms.model.UserRole;
import com.slcms.service.RBACSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/cases")
@CrossOrigin(originPatterns = "*")
public class CaseAccessController {

    private final RBACSecurityService securityService;

    public static String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    // Simulated case repository with standardized and legacy-compatible fields
    private static final List<Map<String, Object>> MOCK_CASES = new ArrayList<>();

    static {
        Map<String, Object> c1 = new HashMap<>();
        c1.put("id", "CASE-2025-001");
        c1.put("title", "Deogratius Peter Shayo v. Republic");
        c1.put("caseTitle", "Deogratius Peter Shayo v. Republic");
        c1.put("caseNumber", "Criminal Appeal No. 30 of 2021");
        c1.put("category", "Criminal Law / Sexual Offence");
        c1.put("caseType", "CRIMINAL");
        c1.put("status", "CLOSED");
        c1.put("clientName", "Deogratius Peter Shayo");
        c1.put("court", "Court of Appeal of Tanzania");
        c1.put("registry", "Dar es Salaam Appellate Registry");
        c1.put("leadCounsel", "Adv. Joyce Mercer");
        c1.put("assignedUserIds", Arrays.asList("usr-001", "usr-002", "usr-003"));
        c1.put("isSensitive", true);
        MOCK_CASES.add(c1);

        Map<String, Object> c2 = new HashMap<>();
        c2.put("id", "CASE-2025-002");
        c2.put("title", "Neema Benson Shabani v. Ramadhani Juma Mpanda");
        c2.put("caseTitle", "Neema Benson Shabani v. Ramadhani Juma Mpanda");
        c2.put("caseNumber", "Land Revision No. 31364 of 2024");
        c2.put("category", "Land Law / Limitation");
        c2.put("caseType", "LAND");
        c2.put("status", "CLOSED");
        c2.put("clientName", "Neema Benson Shabani");
        c2.put("court", "High Court of Tanzania (Land Division)");
        c2.put("registry", "Dar es Salaam Land Registry");
        c2.put("leadCounsel", "Adv. David Croft");
        c2.put("assignedUserIds", Arrays.asList("usr-001", "usr-003", "usr-004"));
        c2.put("isSensitive", false);
        MOCK_CASES.add(c2);

        Map<String, Object> c3 = new HashMap<>();
        c3.put("id", "CASE-2025-003");
        c3.put("title", "Peter Thomas Bocco v. Republic");
        c3.put("caseTitle", "Peter Thomas Bocco v. Republic");
        c3.put("caseNumber", "DC Criminal Revision No. 000006375 of 2025");
        c3.put("category", "Criminal Revision / Evidence");
        c3.put("caseType", "CRIMINAL");
        c3.put("status", "ACTIVE");
        c3.put("clientName", "Peter Thomas Bocco");
        c3.put("court", "Resident Magistrate Court of Ilala");
        c3.put("registry", "Ilala District Registry");
        c3.put("leadCounsel", "Adv. Joyce Mercer");
        c3.put("assignedUserIds", Arrays.asList("usr-001", "usr-002", "usr-005"));
        c3.put("isSensitive", false);
        MOCK_CASES.add(c3);

        Map<String, Object> c4 = new HashMap<>();
        c4.put("id", "CASE-2025-004");
        c4.put("title", "Rogath K. Katende v. CRDB Bank PLC & Others");
        c4.put("caseTitle", "Rogath K. Katende v. CRDB Bank PLC & Others");
        c4.put("caseNumber", "Misc. Civil Application No. 7327 of 2025");
        c4.put("category", "Commercial / Banking / Extension of Time");
        c4.put("caseType", "COMMERCIAL");
        c4.put("status", "ACTIVE");
        c4.put("clientName", "Rogath K. Katende");
        c4.put("court", "High Court Commercial Division");
        c4.put("registry", "Commercial Division Registry");
        c4.put("leadCounsel", "Adv. Eleanor Vance");
        c4.put("assignedUserIds", Arrays.asList("usr-001", "usr-002", "usr-003", "usr-004", "usr-005"));
        c4.put("isSensitive", false);
        MOCK_CASES.add(c4);
    }

    @Autowired
    public CaseAccessController(RBACSecurityService securityService) {
        this.securityService = securityService;
    }

    @GetMapping
    public ResponseEntity<?> listCases(@RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        if (userEmail == null || userEmail.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AccessDeniedResponse.of("UNAUTHENTICATED", "Authentication required to access legal records."));
        }

        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User record not found"));
        }

        UserAccount user = userOpt.get();
        if (user.getRole() == UserRole.MANAGING_PARTNER || user.getRole() == UserRole.SYSTEM_ADMINISTRATOR) {
            return ResponseEntity.ok(MOCK_CASES);
        }

        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> c : MOCK_CASES) {
            String caseId = (String) c.get("id");
            if (user.getAssignedCaseIds() != null && user.getAssignedCaseIds().contains(caseId)) {
                filtered.add(c);
            }
        }
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<?> getCaseDetails(@PathVariable String caseId,
                                            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User not authenticated"));
        }

        UserAccount user = userOpt.get();
        if (!securityService.canAccessCase(user, caseId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("Case assignment required"));
        }

        for (Map<String, Object> c : MOCK_CASES) {
            if (c.get("id").equals(caseId)) {
                return ResponseEntity.ok(c);
            }
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
    }

    @PostMapping("/create")
    public ResponseEntity<?> createCase(@RequestBody Map<String, Object> payload,
                                        @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User not authenticated"));
        }

        UserAccount user = userOpt.get();
        if (!securityService.hasPermission(user, "CREATE_CASE")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("Role not authorized to create matters"));
        }

        String newId = "CASE-2026-00" + (MOCK_CASES.size() + 1);
        Map<String, Object> newCase = new HashMap<>(payload);
        newCase.put("id", newId);

        String title = safeText((String) (newCase.get("caseTitle") != null ? newCase.get("caseTitle") : newCase.get("title")), "Untitled Case");
        String caseType = safeText((String) (newCase.get("caseType") != null ? newCase.get("caseType") : newCase.get("category")), "OTHER");
        String status = safeText((String) newCase.get("status"), "UNASSIGNED");
        String priority = safeText((String) newCase.get("priority"), "MEDIUM");
        String clientName = safeText((String) (newCase.get("clientName") != null ? newCase.get("clientName") : newCase.get("client")), "No client linked");
        String court = safeText((String) newCase.get("court"), "Not provided");
        String registry = safeText((String) newCase.get("registry"), "");

        newCase.put("title", title);
        newCase.put("caseTitle", title);
        newCase.put("caseType", caseType);
        newCase.put("category", caseType);
        newCase.put("status", status);
        newCase.put("priority", priority);
        newCase.put("clientName", clientName);
        newCase.put("court", court);
        newCase.put("registry", registry);

        MOCK_CASES.add(newCase);

        return ResponseEntity.status(HttpStatus.CREATED).body(newCase);
    }

    @PostMapping("/{caseId}/assign")
    public ResponseEntity<?> assignCase(@PathVariable String caseId,
                                        @RequestBody Map<String, String> payload,
                                        @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User not authenticated"));
        }

        UserAccount user = userOpt.get();
        if (!securityService.hasPermission(user, "ASSIGN_CASE")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("Role not authorized to reassign matters"));
        }

        return ResponseEntity.ok(Map.of("message", "Case assigned successfully", "caseId", caseId, "assignedTo", payload.get("userId")));
    }

    @PostMapping("/{caseId}/close")
    public ResponseEntity<?> closeCase(@PathVariable String caseId,
                                       @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User not authenticated"));
        }

        UserAccount user = userOpt.get();
        if (!securityService.hasPermission(user, "CLOSE_CASE")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("Only Managing Partner may close or archive matters"));
        }

        return ResponseEntity.ok(Map.of("message", "Case closed and archived successfully", "caseId", caseId));
    }

    @GetMapping("/{caseId}/documents/{docId}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable String caseId,
                                              @PathVariable String docId,
                                              @RequestParam(defaultValue = "CONFIDENTIAL") String sensitivity,
                                              @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        Optional<UserAccount> userOpt = securityService.findUserByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("User not authenticated"));
        }

        UserAccount user = userOpt.get();
        DocumentSensitivity docSens = DocumentSensitivity.valueOf(sensitivity.toUpperCase());

        if (!securityService.canAccessDocument(user, caseId, docSens)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AccessDeniedResponse.defaultAccessDenied("Document sensitivity exceeds role clearings"));
        }

        return ResponseEntity.ok(Map.of("message", "Document authorized for download", "docId", docId, "caseId", caseId));
    }
}
