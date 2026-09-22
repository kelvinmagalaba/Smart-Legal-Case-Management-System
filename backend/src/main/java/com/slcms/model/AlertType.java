package com.slcms.model;

/**
 * Standardized security alert classifications for SLCMS.
 * Uses simple, accurate names reflecting authentic system events.
 */
public enum AlertType {
    ACCOUNT_LOCKED,
    FIRST_LOGIN_PENDING,
    TEMPORARY_PASSWORD_EXPIRED,
    PASSWORD_RESET_REQUESTED,
    ACCOUNT_SUSPENDED,
    UNAUTHORIZED_ACCESS
}
