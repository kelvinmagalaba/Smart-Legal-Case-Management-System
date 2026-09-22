package com.slcms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Gmail SMTP Configuration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpConfigDTO {
    private String host;
    private int port;
    private boolean enableSsl;
    private String username;
    private String password;
    private boolean hasPassword;
    private String fromEmail;
    private String fromName;
    private boolean configured;
    private String lastTestedAt;
    private String testStatus;
}
