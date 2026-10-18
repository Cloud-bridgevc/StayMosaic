# Architecture

## Principle
AI recommends within hotel-configured rules. Staff approve tasks, decide escalations and send guest messages. These are enforced in code (`src/lib/store.tsx`, `src/lib/permissions.ts`) and in the database schema (`escalated_by_human`, `approved_by_human`, `safety_rule_locked` constraints).

## Target architecture
```
Guest form / front desk ──▶ Web app (Next.js) ──▶ PostgreSQL (tasks, rules, properties, audit)
                                  │ │
                                  │ └─▶ SQS ─▶ Lambda classify-request ─▶ Bedrock (Converse)
                                  │                                        └▶ rules-engine fallback
                                  ├─▶ S3 presigned PUT ─▶ Lambda attachment-processor (validate, scan status)
                                  └─▶ EventBridge schedule ─▶ Lambda shift-handover ─▶ Bedrock (narrative only)
Website demo form ─▶ /api/demo-request ─▶ (planned) HubSpot Forms API
```

## What is real in this repository
| Piece | State |
|---|---|
| Public website, dashboard, rules engine, handover builder, assistant, analytics | Working. Data lives in browser `localStorage`. |
| `src/lib/bedrock.ts` | Written, **never run against AWS**. Activates with `BEDROCK_MODEL_ID` + credentials; any failure falls back to rules. |
| `db/schema.sql` | Written, **not executed**. |
| `infra/` (SAM + 3 Lambdas) | Scaffold, **not built or deployed**. Needs `pg`, `@aws-sdk/client-secrets-manager`, `@types/aws-lambda`. |
| `/api/attachments/presign` | Works up to validation; returns 501 until `S3_BUCKET` is set. S3 path untested. |
| HubSpot, messaging, PMS, SSO | Not built. |

## AI guardrails
- **Rule-bound output.** Bedrock returns a rule ID; department, priority, SLA and action are read from the rule, never from model text.
- **Safety floor.** A deterministic safety-critical keyword match overrides the model and cannot be downgraded.
- **Untrusted input.** Guest text is wrapped in `<guest_message>` tags and the system prompt says to ignore instructions inside it. The worst a prompt injection can do is choose a wrong enabled rule, and staff still approve.
- **Grounded summaries.** Handover and assistant prose is generated only from already-computed, already-authorised facts.
- **Low confidence → human.** Below the configured threshold the request is flagged for manual triage.

## Known prototype limitations (production blockers)
1. **No authentication.** The "Viewing as" selector is a demo. API routes trust client-supplied user and data; production must derive identity from a verified session and read PostgreSQL server-side.
2. **Client-held state.** No multi-user sync, no durable audit log.
3. **In-memory rate limiting** only protects a single instance; use API Gateway/WAF in production.
4. **Guest data protection** (retention, deletion, DPA, regional hosting, malware scanning) is designed, not implemented.
5. **Classifier quality** is untested beyond sample messages; keyword rules miss paraphrases and non-English text. Evaluate on real, anonymised requests before relying on it, and measure safety-term recall specifically.
6. **Bedrock prompts** have not been evaluated; add an offline test set and monitor override rates.
