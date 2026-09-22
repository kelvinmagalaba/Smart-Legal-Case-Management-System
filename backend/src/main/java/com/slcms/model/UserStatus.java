package com.slcms.model;

/**
 * Account Security and Lifecycle States.
 */
public enum UserStatus {
    ACTIVE("Active"),
    FIRST_LOGIN_PENDING("First Login Pending"),
    LOCKED("Locked"),
    DEACTIVATED("Deactivated");

    private final String displayName;

    UserStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
