package com.slcms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slcms.dto.ClientMessageDTO;
import com.slcms.dto.SmtpConfigDTO;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

/**
 * Service for Client Message Generation, Approval Governance, and Multi-Channel Dispatch.
 * Gmail SMTP delivery is performed by JavaMailSender; status is set to "Sent" only after
 * a successful send, or "Failed" if Gmail rejects / cannot be reached.
 */
@Service
public class ClientMessageService {

    private static final Logger log = LoggerFactory.getLogger(ClientMessageService.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final File commsFile    = new File("data/communications.json");
    private final File smtpConfigFile = new File("data/smtp_config.json");

    /** Injected by Spring Boot Mail auto-configuration from application.properties */
    private final JavaMailSender mailSender;

    /** Sender address comes from the spring.mail.username property (environment variable). */
    @Value("${spring.mail.username:legalcasem@gmail.com}")
    private String fromAddress;

    @Autowired
    public ClientMessageService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // -------------------------------------------------------------------------
    // Read / write communications records  (unchanged)
    // -------------------------------------------------------------------------

    public synchronized List<ClientMessageDTO> getAllMessages() {
        if (!commsFile.exists()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(commsFile, new TypeReference<List<ClientMessageDTO>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    public synchronized ClientMessageDTO saveMessage(ClientMessageDTO message) {
        List<ClientMessageDTO> list = getAllMessages();
        String now = Instant.now().toString();

        if (message.getMessageId() == null || message.getMessageId().trim().isEmpty()) {
            message.setMessageId("msg-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4));
        }
        if (message.getCreatedAt() == null) {
            message.setCreatedAt(now);
        }
        message.setUpdatedAt(now);

        int existingIndex = -1;
        for (int i = 0; i < list.size(); i++) {
            if (message.getMessageId().equals(list.get(i).getMessageId())) {
                existingIndex = i;
                break;
            }
        }

        if (existingIndex >= 0) {
            list.set(existingIndex, message);
        } else {
            list.add(0, message);
        }

        persistMessages(list);
        return message;
    }

    public synchronized ClientMessageDTO updateMessage(String messageId, Map<String, Object> updates) {
        List<ClientMessageDTO> list = getAllMessages();
        ClientMessageDTO target = null;

        for (ClientMessageDTO msg : list) {
            if (messageId.equals(msg.getMessageId())) {
                target = msg;
                break;
            }
        }

        if (target == null) {
            return null;
        }

        if (updates.containsKey("status"))       target.setStatus((String) updates.get("status"));
        if (updates.containsKey("approvedBy"))   target.setApprovedBy((String) updates.get("approvedBy"));
        if (updates.containsKey("subject"))      target.setSubject((String) updates.get("subject"));
        if (updates.containsKey("messageBody"))  target.setMessageBody((String) updates.get("messageBody"));
        if (updates.containsKey("recipient"))    target.setRecipient((String) updates.get("recipient"));
        target.setUpdatedAt(Instant.now().toString());

        persistMessages(list);
        return target;
    }

    // -------------------------------------------------------------------------
    // SMTP send  —  status is "Sent" ONLY after mailSender.send() returns OK
    // -------------------------------------------------------------------------

    public synchronized ClientMessageDTO sendEmailMessage(ClientMessageDTO payload, String senderName) {

        // 1. Basic validation
        if (payload.getRecipient() == null || payload.getRecipient().trim().isEmpty()
                || !payload.getRecipient().contains("@")) {
            throw new IllegalArgumentException("The client does not have a valid email address.");
        }
        if (payload.getSubject() == null || payload.getSubject().trim().isEmpty()) {
            throw new IllegalArgumentException("Email subject must not be empty.");
        }

        String now     = Instant.now().toString();
        String provRef = "GMAIL-SMTP-" + System.currentTimeMillis();

        // 2. Build the record in a "pending" state (not yet saved)
        payload.setChannel("Email");
        payload.setSentBy(senderName != null ? senderName : "SLCMS Advocate");
        payload.setSentAt(now);
        payload.setProviderReference(provRef);

        // 3. Attempt real SMTP delivery via Gmail
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");

            helper.setFrom(fromAddress, "SLCMS Law Firm");
            helper.setTo(payload.getRecipient().trim());
            helper.setSubject(payload.getSubject());
            helper.setText(payload.getMessageBody() != null ? payload.getMessageBody() : "", false);

            mailSender.send(mime);           // <-- actual SMTP call to smtp.gmail.com:587

            // 4a. Gmail accepted the message → mark Sent
            payload.setStatus("Sent");
            payload.setFailureReason(null);
            log.info("Email sent successfully via Gmail SMTP to {} (ref: {})", payload.getRecipient(), provRef);

        } catch (Exception ex) {
            // 4b. SMTP failed → mark Failed, persist the draft, and rethrow
            payload.setStatus("Failed");
            // Safe failure message — does NOT expose password or stack trace
            String safeReason = buildSafeFailureReason(ex);
            payload.setFailureReason(safeReason);
            log.error("Gmail SMTP delivery failed for recipient {}: {}", payload.getRecipient(), safeReason);

            // Persist the failed record so operators can review it
            saveMessage(payload);

            // Rethrow so the controller returns 500 with a safe error body
            throw new RuntimeException("Gmail SMTP delivery failed: " + safeReason, ex);
        }

        // 5. Persist the successfully sent record
        return saveMessage(payload);
    }

    // -------------------------------------------------------------------------
    // SMTP configuration helpers  (unchanged)
    // -------------------------------------------------------------------------

    public synchronized SmtpConfigDTO getSmtpConfig() {
        if (!smtpConfigFile.exists()) {
            return SmtpConfigDTO.builder()
                    .host("smtp.gmail.com")
                    .port(587)
                    .enableSsl(true)
                    .username("legalcasem@gmail.com")
                    .fromEmail("legalcasem@gmail.com")
                    .fromName("SLCMS Law Firm")
                    .configured(true)
                    .lastTestedAt(Instant.now().toString())
                    .testStatus("Ready")
                    .build();
        }
        try {
            return objectMapper.readValue(smtpConfigFile, SmtpConfigDTO.class);
        } catch (IOException e) {
            return new SmtpConfigDTO();
        }
    }

    public synchronized SmtpConfigDTO saveSmtpConfig(SmtpConfigDTO config) {
        config.setConfigured(true);
        config.setLastTestedAt(Instant.now().toString());
        try {
            objectMapper.writeValue(smtpConfigFile, config);
        } catch (IOException ignored) {}
        return config;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void persistMessages(List<ClientMessageDTO> list) {
        try {
            objectMapper.writeValue(commsFile, list);
        } catch (IOException ignored) {}
    }

    /**
     * Converts a mail exception to a user-facing message that is safe to return
     * in API responses — it never contains credentials or raw passwords.
     */
    private String buildSafeFailureReason(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null) return "Unknown SMTP error.";
        // Strip any credential hints that JavaMail may embed
        msg = msg.replaceAll("(?i)(password|credentials?|secret|app.?pass(word)?)[^;,\\.\\n]*", "[REDACTED]");
        if (msg.contains("535") || msg.contains("Authentication")) {
            return "Gmail authentication failed. Verify that the App Password is correct and 2-Step Verification is enabled on the sender account.";
        }
        if (msg.contains("550") || msg.contains("invalid address") || msg.contains("No route to host")) {
            return "Invalid or unreachable recipient email address.";
        }
        if (msg.contains("timeout") || msg.contains("timed out") || msg.contains("ConnectException")) {
            return "Connection to Gmail SMTP timed out. Check network connectivity.";
        }
        if (msg.contains("Could not connect") || msg.contains("Connection refused")) {
            return "Could not connect to smtp.gmail.com:587. Check network / firewall settings.";
        }
        // Generic — truncate to avoid leaking too much detail
        return msg.length() > 200 ? msg.substring(0, 200) : msg;
    }
}
