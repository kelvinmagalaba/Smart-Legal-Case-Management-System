package com.slcms.dto;

import java.time.LocalDateTime;

/**
 * Standard security response payload returned when an action is denied by RBAC policy.
 */
public class AccessDeniedResponse {
    private int status = 403;
    private String error = "Access Restricted";
    private String message = "You are not authorized to perform this action. This matter has not been assigned to your account. Contact your supervising lawyer or system administrator if access is required.";
    private String timestamp = LocalDateTime.now().toString();

    public AccessDeniedResponse() {}

    public AccessDeniedResponse(String customMessage) {
        if (customMessage != null && !customMessage.trim().isEmpty()) {
            this.message = customMessage;
        }
    }

    public static AccessDeniedResponse of(String error, String message) {
        AccessDeniedResponse resp = new AccessDeniedResponse(message);
        resp.setError(error);
        return resp;
    }

    public static AccessDeniedResponse defaultAccessDenied(String reason) {
        return new AccessDeniedResponse("Access Restricted: " + reason);
    }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
