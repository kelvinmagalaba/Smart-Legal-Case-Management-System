-- ============================================================================
-- SLCMS Database Migration: V2__fix_missing_case_fields.sql
-- Goal: Normalize legacy case records and prevent null/empty fields
-- IMPORTANT: Back up the database before running updates in production.
-- ============================================================================

-- 1. Ensure cases table exists with all standard columns
CREATE TABLE IF NOT EXISTS cases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    case_number VARCHAR(100) NOT NULL UNIQUE,
    case_title VARCHAR(255) NOT NULL DEFAULT 'Untitled Case',
    title VARCHAR(255),
    case_type VARCHAR(100) NOT NULL DEFAULT 'OTHER',
    type VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'UNASSIGNED',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    client_name VARCHAR(255) NOT NULL DEFAULT 'No client linked',
    court VARCHAR(255) NOT NULL DEFAULT 'Not provided',
    registry VARCHAR(255) DEFAULT '',
    assigned_counsel VARCHAR(255) DEFAULT 'Unassigned',
    decision_year VARCHAR(10) DEFAULT 'Not provided',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Backfill missing statuses with safe default 'UNASSIGNED'
UPDATE cases
SET status = 'UNASSIGNED'
WHERE status IS NULL OR TRIM(status) = '';

-- 3. Backfill missing case types with safe default 'OTHER'
UPDATE cases
SET case_type = 'OTHER'
WHERE case_type IS NULL OR TRIM(case_type) = '';

-- 4. Backfill missing case titles with safe default 'Untitled Case'
UPDATE cases
SET case_title = 'Untitled Case'
WHERE case_title IS NULL OR TRIM(case_title) = '';

-- 5. Backfill client name, court, and priority if missing
UPDATE cases
SET client_name = 'No client linked'
WHERE client_name IS NULL OR TRIM(client_name) = '';

UPDATE cases
SET court = 'Not provided'
WHERE court IS NULL OR TRIM(court) = '';

UPDATE cases
SET priority = 'MEDIUM'
WHERE priority IS NULL OR TRIM(priority) = '';
