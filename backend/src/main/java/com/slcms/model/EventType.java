package com.slcms.model;

/**
 * Standardized security event classifications for SLCMS.
 */
public enum EventType {
    LOGIN_ATTEMPT("Login attempt"),
    LOGIN_SUCCESS("Login attempt"),
    LOGIN_FAILED("Login attempt"),
    ACCOUNT_SECURITY("Account security"),
    TEMPORARY_LOCK("Account security"),
    ACCOUNT_MANAGEMENT("Account management"),
    ADMIN_LOCK("Account management"),
    ADMIN_UNLOCK("Account management"),
    PASSWORD_MANAGEMENT("Password management"),
    PASSWORD_RESET("Password management"),
    USER_MANAGEMENT("User management"),
    PERMISSION_MANAGEMENT("Permission management"),
    SYSTEM_BACKUP("System backup");

    private final String displayName;

    EventType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
