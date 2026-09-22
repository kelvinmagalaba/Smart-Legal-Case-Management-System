-- ============================================================================
-- SLCMS Database Schema — Authentication, Security Governance & Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL UNIQUE,
    employee_id VARCHAR(50),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    role_title VARCHAR(100),
    account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TEMPORARILY_LOCKED, LOCKED, DEACTIVATED
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until BIGINT, -- Epoch ms
    admin_locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_successful_login TIMESTAMP NULL,
    last_failed_login TIMESTAMP NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150),                          -- Full display name (e.g. "Joseph Moss")
    event_type VARCHAR(100) NOT NULL,                -- Display category: "Login attempt", "Account security", etc.
    result VARCHAR(200),                             -- Human-readable outcome shown in the RESULT column
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    ip_address VARCHAR(50),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(50),
    INDEX idx_sec_events_user (user_id),
    INDEX idx_sec_events_type (event_type),
    INDEX idx_sec_events_time (event_time),
    INDEX idx_sec_events_resolved (resolved)
);

CREATE TABLE IF NOT EXISTS security_alerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50),
    full_name VARCHAR(150),
    role VARCHAR(50),
    alert_type VARCHAR(50) NOT NULL, -- TEMPORARY_LOCK, ACCOUNT_LOCKED, FIRST_LOGIN_PENDING
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'HIGH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(50),
    locked_reason VARCHAR(100),
    locked_by VARCHAR(50),
    client_ip VARCHAR(50),
    INDEX idx_sec_alerts_resolved (resolved)
);

CREATE TABLE IF NOT EXISTS system_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(30) NOT NULL,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_setting_audit (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id VARCHAR(50),
    admin_name VARCHAR(150),
    setting_key VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    action_status VARCHAR(30) DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_backups (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'Not Created', 'In Progress', 'Successful', 'Failed'
    created_by VARCHAR(150),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Seed Data
INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_by) VALUES
('organization_name', 'SLCMS Law Firm', 'TEXT', 1),
('system_name', 'Smart Legal Case Management System', 'TEXT', 1),
('system_short_name', 'SLCMS', 'TEXT', 1),
('organization_logo', 'assets/SLCMS.png', 'TEXT', 1),
('official_email', 'admin@slcms.local', 'EMAIL', 1),
('phone_number', '+255700000001', 'PHONE', 1),
('office_address', 'Dar es Salaam, Tanzania', 'TEXT', 1),
('minimum_password_length', '10', 'NUMBER', 1),
('maximum_login_attempts', '3', 'NUMBER', 1),
('lock_duration_minutes', '2', 'NUMBER', 1),
('session_duration_minutes', '60', 'NUMBER', 1),
('maximum_upload_mb', '50', 'NUMBER', 1),
('ocr_enabled', 'true', 'BOOLEAN', 1),
('automatic_backup', 'WEEKLY', 'ENUM', 1),
('allowed_file_types', 'PDF,DOCX,JPG,PNG', 'TEXT', 1),
('case_number_format', 'CV/YYYY/####', 'TEXT', 1)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
