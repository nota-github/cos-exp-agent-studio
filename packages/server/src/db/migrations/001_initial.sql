-- Migration 001: Initial schema
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL,
    last_run_at TEXT,
    last_status TEXT
);

CREATE TABLE IF NOT EXISTS executions (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id),
    request_text  TEXT NOT NULL,
    status        TEXT NOT NULL,
    started_at    TEXT,
    completed_at  TEXT,
    duration_ms   INTEGER,
    summary       TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES executions(id),
    project_id   TEXT NOT NULL REFERENCES projects(id),
    type         TEXT NOT NULL,
    content      TEXT NOT NULL,
    metadata     TEXT,
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    id           TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES executions(id),
    timestamp    TEXT NOT NULL,
    level        TEXT NOT NULL,
    category     TEXT NOT NULL,
    content      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
    id            TEXT PRIMARY KEY,
    execution_id  TEXT NOT NULL REFERENCES executions(id),
    action_type   TEXT NOT NULL,
    target        TEXT NOT NULL,
    risk_level    TEXT NOT NULL,
    description   TEXT NOT NULL,
    status        TEXT NOT NULL,
    requested_at  TEXT NOT NULL,
    decided_at    TEXT
);
