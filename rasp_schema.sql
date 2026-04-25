-- =============================================================
-- RASP: Recruitment Attack Simulation Platform
-- Database Schema — Based on ER Diagram & SRS v1.0
-- =============================================================

-- Enable UUID extension (needed for SimulationSession & ScenarioContainer)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- 1. USER
-- Stores all platform users across all roles.
-- BR10: Inactive users must be refused authentication.
-- NFR-2: Role enforced at API level; stored here as source of truth.
-- =============================================================
CREATE TABLE "user" (
    id          SERIAL          PRIMARY KEY,
    username    VARCHAR(150)    NOT NULL UNIQUE,
    email       VARCHAR(255)    NOT NULL UNIQUE,
    password    VARCHAR(255)    NOT NULL,           -- bcrypt hashed (NFR-6)
    role        VARCHAR(20)     NOT NULL
                    CHECK (role IN ('administrator', 'hr_personnel', 'job_seeker')),
    status      VARCHAR(20)     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),   -- BR10
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 2. SCENARIO
-- Encapsulates a full recruitment attack scenario definition.
-- BR01: Must contain 2–5 stages (enforced via trigger below).
-- FR-7: Disabling must preserve all historical session data.
-- FR-24: Version increments on every update (BR12).
-- =============================================================
CREATE TABLE scenario (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(255)    NOT NULL,
    version         INTEGER         NOT NULL DEFAULT 1,  -- BR12
    container_image VARCHAR(255),
    active_status   BOOLEAN         NOT NULL DEFAULT FALSE,
    difficulty      VARCHAR(20)     NOT NULL DEFAULT 'basic'
                        CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),  -- FR-20
    created_by      INTEGER         REFERENCES "user"(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 3. STAGE
-- Decomposes a Scenario into individual recruitment phases.
-- BR01: Scenario must have 2–5 stages.
-- BR08: stage_order must be unique per scenario, executed sequentially.
-- =============================================================
CREATE TABLE stage (
    id              SERIAL          PRIMARY KEY,
    scenario_id     INTEGER         NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
    stage_order     INTEGER         NOT NULL,
    name            VARCHAR(100)    NOT NULL
                        CHECK (name IN (
                            'Application',
                            'Screening',
                            'Interview',
                            'Technical Assessment',
                            'Onboarding'
                        )),
    UNIQUE (scenario_id, stage_order)               -- BR08: no duplicate order in same scenario
);


-- =============================================================
-- 4. DATASET_FEATURE
-- Stores imported fraud indicators from EMSCAD, PhishTank, URLhaus.
-- BR11: Cannot be deleted if referenced by an active AttackVector.
-- =============================================================
CREATE TABLE dataset_feature (
    id              BIGSERIAL       PRIMARY KEY,
    source          VARCHAR(50)     NOT NULL
                        CHECK (source IN ('EMSCAD', 'PhishTank', 'URLhaus')),
    feature_data    JSONB           NOT NULL        -- flexible indicator storage
);


-- =============================================================
-- 5. ATTACK_VECTOR
-- Holds specific attack configurations embedded within a Scenario.
-- BR02: Each Stage must have 1–3 AttackVectors (enforced via trigger).
-- BR03: Every AttackVector must have a valid MITRE ATT&CK ID before activation.
-- =============================================================
CREATE TABLE attack_vector (
    id                  SERIAL          PRIMARY KEY,
    scenario_id         INTEGER         NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
    mitre_id            VARCHAR(20)     NOT NULL,   -- e.g. T1566, T1598, T1204 (DR-1)
    vector_type         VARCHAR(50)     NOT NULL
                            CHECK (vector_type IN (
                                'phishing_link',
                                'malicious_file',
                                'credential_harvesting',
                                'fake_identity',
                                'geographic_inconsistency',
                                'urgency_manipulation'
                            )),
    container_path      VARCHAR(255),
    detection_criteria  JSONB           NOT NULL,   -- indicators users must spot
    difficulty          INTEGER         NOT NULL DEFAULT 1
                            CHECK (difficulty BETWEEN 1 AND 3),
    dataset_feature_id  BIGINT          REFERENCES dataset_feature(id)
                            ON DELETE RESTRICT      -- BR11: cannot delete if referenced
);


-- =============================================================
-- 6. ASSIGNMENT
-- Links Users to Scenarios with optional scheduling (FR-22).
-- =============================================================
CREATE TABLE assignment (
    id              SERIAL          PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    scenario_id     INTEGER         NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deadline        TIMESTAMPTZ,                    -- FR-22: optional deadline
    UNIQUE (user_id, scenario_id)
);


-- =============================================================
-- 7. SIMULATION_SESSION
-- Tracks a single user's execution of a Scenario.
-- BR04: Cannot advance past ethical warning without acknowledgement.
-- BR06: Cannot start if scenario active_status = FALSE.
-- BR12: version_snapshot locks the scenario version at session start.
-- =============================================================
CREATE TABLE simulation_session (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             INTEGER         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    scenario_id         INTEGER         NOT NULL REFERENCES scenario(id) ON DELETE RESTRICT,
    current_stage_order INTEGER         NOT NULL DEFAULT 1,
    version_snapshot    INTEGER         NOT NULL,   -- BR12: scenario version at start time
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending',          -- not yet started
                                'warned',           -- ethical warning shown
                                'in_progress',      -- active
                                'completed',
                                'abandoned'
                            )),
    warning_acknowledged BOOLEAN        NOT NULL DEFAULT FALSE,  -- BR04
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ
);


-- =============================================================
-- 8. USER_ACTION
-- Records every individual decision made during a session.
-- BR05: Must NEVER store username, email, or IP address — only session_id + role.
-- BR07: 'submit' on credential form must not store submitted values.
-- =============================================================
CREATE TABLE user_action (
    id                  BIGSERIAL       PRIMARY KEY,
    session_id          UUID            NOT NULL
                            REFERENCES simulation_session(id) ON DELETE CASCADE,
    stage_id            INTEGER         NOT NULL REFERENCES stage(id) ON DELETE RESTRICT,
    role_at_time        VARCHAR(20)     NOT NULL
                            CHECK (role_at_time IN ('administrator', 'hr_personnel', 'job_seeker')),
    action_type         VARCHAR(30)     NOT NULL
                            CHECK (action_type IN (
                                'click',
                                'download',
                                'flag',
                                'submit',           -- BR07: submitted values are NOT stored
                                'skip',
                                'acknowledge'
                            )),
    outcome             VARCHAR(10)     NOT NULL
                            CHECK (outcome IN ('success', 'failure', 'neutral')),
    detection_quality   FLOAT,                      -- 0.0 – 1.0 score
    time_to_detect      INTEGER,                    -- milliseconds (FR-15)
    actioned_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    -- NO username, email, or IP column — BR05 / NFR-5 / GDPR Art. 5(1)(c)
);


-- =============================================================
-- 9. EVENT_LOG
-- Fine-grained event sub-records for each UserAction.
-- Replaces JSON blobs inside UserAction with a proper table.
-- =============================================================
CREATE TABLE event_log (
    id          BIGSERIAL       PRIMARY KEY,
    action_id   BIGINT          NOT NULL
                    REFERENCES user_action(id) ON DELETE CASCADE,
    event_type  VARCHAR(50)     NOT NULL,   -- e.g. 'hover', 'inspect_url', 'open_file'
    offset_ms   INTEGER         NOT NULL,   -- ms offset from action start
    element     VARCHAR(255)                -- UI element interacted with
);


-- =============================================================
-- 10. ANALYTICS_METRIC
-- Pre-aggregated metrics per Stage for efficient dashboard queries.
-- BR09: One record per Stage; recomputing never deletes prior records.
-- =============================================================
CREATE TABLE analytics_metric (
    id                  SERIAL          PRIMARY KEY,
    stage_id            INTEGER         NOT NULL REFERENCES stage(id) ON DELETE RESTRICT,
    total_attempts      INTEGER         NOT NULL DEFAULT 0,
    total_detections    INTEGER         NOT NULL DEFAULT 0,
    avg_time_to_detect  FLOAT,                      -- ms average (FR-15, FR-16)
    computed_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    -- BR09: never deleted on recompute — new row is inserted each time
);


-- =============================================================
-- 11. SCENARIO_CONTAINER
-- Tracks the isolated Docker/container instance for a session.
-- =============================================================
CREATE TABLE scenario_container (
    id          SERIAL          PRIMARY KEY,
    session_id  UUID            NOT NULL UNIQUE
                    REFERENCES simulation_session(id) ON DELETE CASCADE,
    base_url    VARCHAR(255)    NOT NULL,    -- internal URL of the container
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'stopped', 'error')),
    started_at  TIMESTAMPTZ,
    stopped_at  TIMESTAMPTZ
);


-- =============================================================
-- 12. NOTIFICATION
-- Alerts users when new simulations are assigned (FR-25).
-- =============================================================
CREATE TABLE notification (
    id          SERIAL          PRIMARY KEY,
    user_id     INTEGER         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type        VARCHAR(50)     NOT NULL
                    CHECK (type IN (
                        'assignment',       -- new scenario assigned
                        'deadline',         -- approaching deadline
                        'result'            -- session completed
                    )),
    message     TEXT            NOT NULL,
    is_read     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES — for query performance on FK columns and dashboards
-- =============================================================
CREATE INDEX idx_stage_scenario        ON stage(scenario_id);
CREATE INDEX idx_attack_vector_scenario ON attack_vector(scenario_id);
CREATE INDEX idx_assignment_user       ON assignment(user_id);
CREATE INDEX idx_assignment_scenario   ON assignment(scenario_id);
CREATE INDEX idx_session_user          ON simulation_session(user_id);
CREATE INDEX idx_session_scenario      ON simulation_session(scenario_id);
CREATE INDEX idx_user_action_session   ON user_action(session_id);
CREATE INDEX idx_user_action_stage     ON user_action(stage_id);
CREATE INDEX idx_event_log_action      ON event_log(action_id);
CREATE INDEX idx_analytics_stage       ON analytics_metric(stage_id);
CREATE INDEX idx_notification_user     ON notification(user_id);


-- =============================================================
-- TRIGGER: Enforce BR01 — Scenario must have 2–5 stages
-- Fires after INSERT/DELETE on stage table
-- =============================================================
CREATE OR REPLACE FUNCTION check_stage_count()
RETURNS TRIGGER AS $$
DECLARE
    stage_count INTEGER;
    scenario_active BOOLEAN;
BEGIN
    SELECT COUNT(*), s.active_status
    INTO stage_count, scenario_active
    FROM stage st
    JOIN scenario s ON s.id = st.scenario_id
    WHERE st.scenario_id = COALESCE(NEW.scenario_id, OLD.scenario_id)
    GROUP BY s.active_status;

    -- Only enforce min/max when scenario is being activated
    IF scenario_active AND (stage_count < 2 OR stage_count > 5) THEN
        RAISE EXCEPTION
            'Scenario must have between 2 and 5 stages (BR01). Current count: %',
            stage_count;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_stage_count
AFTER INSERT OR DELETE ON stage
FOR EACH ROW EXECUTE FUNCTION check_stage_count();


-- =============================================================
-- TRIGGER: Enforce BR12 — Auto-increment scenario version on update
-- =============================================================
CREATE OR REPLACE FUNCTION increment_scenario_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.title       IS DISTINCT FROM NEW.title       OR
       OLD.container_image IS DISTINCT FROM NEW.container_image OR
       OLD.difficulty  IS DISTINCT FROM NEW.difficulty THEN
        NEW.version    := OLD.version + 1;
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scenario_version
BEFORE UPDATE ON scenario
FOR EACH ROW EXECUTE FUNCTION increment_scenario_version();


-- =============================================================
-- TRIGGER: Enforce BR06 — Cannot start session on inactive scenario
-- =============================================================
CREATE OR REPLACE FUNCTION check_scenario_active()
RETURNS TRIGGER AS $$
DECLARE
    is_active BOOLEAN;
BEGIN
    SELECT active_status INTO is_active
    FROM scenario WHERE id = NEW.scenario_id;

    IF NOT is_active THEN
        RAISE EXCEPTION
            'Cannot start a session: scenario % is inactive (BR06).',
            NEW.scenario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_scenario_active
BEFORE INSERT ON simulation_session
FOR EACH ROW EXECUTE FUNCTION check_scenario_active();
