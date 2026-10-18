-- StayMosaic PostgreSQL schema (target design; NOT connected to the prototype UI).
-- Not yet executed against a live database. Review before use.
-- Multi-tenant: every row belongs to an organisation; access is further scoped by property and department.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE department_id AS ENUM ('reception', 'housekeeping', 'maintenance');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'blocked', 'done');
CREATE TYPE request_status AS ENUM ('new', 'converted', 'dismissed');
CREATE TYPE request_channel AS ENUM ('web_form', 'messaging', 'front_desk_logged');
CREATE TYPE staff_role AS ENUM ('group_manager', 'duty_manager', 'front_desk', 'housekeeping_supervisor', 'maintenance_lead');

CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hubspot_company_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('hotel', 'serviced_apartment')),
  city text,
  units integer NOT NULL CHECK (units > 0),
  timezone text NOT NULL DEFAULT 'UTC'
);

CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  idp_subject text UNIQUE NOT NULL,          -- OIDC/Cognito subject; identity lives in the IdP
  name text NOT NULL,
  role staff_role NOT NULL,
  department department_id,
  active boolean NOT NULL DEFAULT true
);

-- Which properties and departments a staff member may see. Enforced in the API and, optionally, by RLS.
CREATE TABLE staff_access (
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  department department_id NOT NULL,
  PRIMARY KEY (staff_id, property_id, department)
);

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at)
);

CREATE TABLE routing_rules (
  id text NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  category text NOT NULL,
  department department_id NOT NULL,
  priority priority_level NOT NULL,
  action text NOT NULL,
  sla_minutes integer NOT NULL CHECK (sla_minutes BETWEEN 1 AND 10080),
  suggest_escalation boolean NOT NULL DEFAULT false,
  safety_critical boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, id),
  -- Safety rules may not be disabled or downgraded.
  CONSTRAINT safety_rule_locked CHECK (NOT safety_critical OR (enabled AND priority = 'urgent'))
);

CREATE TABLE guest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  room text NOT NULL,
  vip boolean NOT NULL DEFAULT false,
  channel request_channel NOT NULL,
  message text NOT NULL CHECK (char_length(message) <= 2000),
  status request_status NOT NULL DEFAULT 'new',
  received_at timestamptz NOT NULL DEFAULT now(),
  -- AI output is stored as a recommendation, never as a decision.
  ai_rule_id text,
  ai_department department_id,
  ai_priority priority_level,
  ai_confidence numeric(3,2),
  ai_source text CHECK (ai_source IN ('rules', 'bedrock')),
  ai_payload jsonb,                          -- full classification incl. rationale and reply draft
  ai_model_id text,
  triaged_by uuid REFERENCES staff(id),
  triaged_at timestamptz
);
CREATE INDEX guest_requests_inbox_idx ON guest_requests (property_id, status, received_at);

CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES guest_requests(id) ON DELETE CASCADE,
  s3_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 8388608),
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','infected','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  request_id uuid REFERENCES guest_requests(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('guest_request', 'scheduled', 'staff_created')),
  department department_id NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  room text NOT NULL,
  priority priority_level NOT NULL,
  status task_status NOT NULL DEFAULT 'open',
  assignee_id uuid REFERENCES staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  resolved_at timestamptz,
  blocked_reason text,
  escalated boolean NOT NULL DEFAULT false,
  escalated_by uuid REFERENCES staff(id),
  escalation_suggested boolean NOT NULL DEFAULT false,
  escalation_suggestion_dismissed boolean NOT NULL DEFAULT false,
  ai_recommended boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES staff(id),
  CONSTRAINT escalated_by_human CHECK (NOT escalated OR escalated_by IS NOT NULL),
  CONSTRAINT approved_by_human CHECK (source <> 'guest_request' OR approved_by IS NOT NULL)
);
CREATE INDEX tasks_queue_idx ON tasks (property_id, department, status, due_at);
CREATE INDEX tasks_recurring_idx ON tasks (property_id, room, category, created_at);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  themes text[] NOT NULL DEFAULT '{}',
  posted_at timestamptz NOT NULL
);

CREATE TABLE handover_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES staff(id),    -- NULL when produced by the scheduled Lambda
  shift_label text NOT NULL,
  source text NOT NULL CHECK (source IN ('rules', 'bedrock')),
  report jsonb NOT NULL
);

-- Append-only audit trail of approvals, changes and escalations.
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES staff(id),
  actor_label text NOT NULL,                 -- 'system:lambda:classify' for automated actors
  action text NOT NULL,
  target_type text,
  target_id text,
  detail text NOT NULL
);
CREATE INDEX audit_log_target_idx ON audit_log (target_type, target_id);

-- Optional defence in depth: row-level security by property. The API sets app.property_ids per request.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_property_scope ON tasks
  USING (property_id::text = ANY (string_to_array(current_setting('app.property_ids', true), ',')));
