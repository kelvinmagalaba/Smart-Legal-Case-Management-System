package com.slcms.controller;

import com.slcms.dto.ClientMessageDTO;
import com.slcms.dto.SmtpConfigDTO;
import com.slcms.service.ClientMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST API for Client Message Generator, Communication History & Gmail SMTP Integration.
 */
@RestController
@CrossOrigin(originPatterns = "*")
public class CommunicationController {

    private final ClientMessageService messageService;

    @Autowired
    public CommunicationController(ClientMessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping({"/api/communications/history", "/api/communications/messages"})
    public ResponseEntity<List<ClientMessageDTO>> getHistory() {
        return ResponseEntity.ok(messageService.getAllMessages());
    }

    @PostMapping("/api/communications/messages")
    public ResponseEntity<ClientMessageDTO> saveMessage(@RequestBody ClientMessageDTO message) {
        return ResponseEntity.ok(messageService.saveMessage(message));
    }

    @PutMapping("/api/communications/messages/{id}")
    public ResponseEntity<?> updateMessage(@PathVariable("id") String id, @RequestBody Map<String, Object> updates) {
        ClientMessageDTO updated = messageService.updateMessage(id, updates);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/api/communications/send-email")
    public ResponseEntity<?> sendEmail(
            @RequestBody ClientMessageDTO payload,
            @RequestHeader(value = "X-User-Name", required = false) String userName) {
        try {
            ClientMessageDTO sent = messageService.sendEmailMessage(payload, userName);
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("message", "Email sent successfully via Gmail SMTP to " + sent.getRecipient() + ".");
            res.put("messageId", sent.getMessageId());
            res.put("providerReference", sent.getProviderReference());
            res.put("record", sent);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("message", "Email could not be sent. Your draft has been saved.");
            err.put("failureReason", e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping("/api/admin/smtp-config")
    public ResponseEntity<SmtpConfigDTO> getSmtpConfig() {
        SmtpConfigDTO cfg = messageService.getSmtpConfig();
        cfg.setPassword(null); // Never expose plain password
        return ResponseEntity.ok(cfg);
    }

    @PostMapping("/api/admin/smtp-config")
    public ResponseEntity<?> saveSmtpConfig(@RequestBody SmtpConfigDTO config) {
        SmtpConfigDTO saved = messageService.saveSmtpConfig(config);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Gmail SMTP configuration saved successfully.");
        res.put("config", saved);
        return ResponseEntity.ok(res);
    }
}
