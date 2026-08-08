-- TOTP-based one-time admin authorization for staff-initiated mutations (e.g. order void)

CREATE TABLE StaffTotpSecret (
    staff_id TEXT PRIMARY KEY,
    secret_encrypted TEXT NOT NULL,
    enrolled_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE
);

CREATE TABLE AuthorizationGrant (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    admin_staff_id TEXT NOT NULL,
    requested_by_staff_id TEXT NOT NULL,
    code_step INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL,
    consumed_at INTEGER,
    UNIQUE (admin_staff_id, code_step),
    FOREIGN KEY (admin_staff_id) REFERENCES Staff(id),
    FOREIGN KEY (requested_by_staff_id) REFERENCES Staff(id)
);

CREATE INDEX idx_authorization_grant_lookup
    ON AuthorizationGrant (action, resource_type, resource_id, consumed_at, created_at);

-- Internal-only key/value store for secrets that must never be exposed via the public Settings API.
CREATE TABLE AppSecret (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Distinct from voided_by (who performed the void): which admin's code authorized it, if any.
ALTER TABLE "Order" ADD COLUMN authorized_by TEXT REFERENCES Staff(id);
