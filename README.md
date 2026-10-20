# StayMosaic

AI-native operations platform for hotels and serviced apartments. Website: https://staymosaic.site Guest requests become organised, trackable tasks; the AI **recommends** within hotel-configured rules and **staff decide**.

> **Prototype.** Everything shown uses fictional sample data. See [Honest status](#honest-status).

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
```
No AWS account or environment variables are needed.

## Pages
- Website: `/`, `/features`, `/use-cases`, `/pricing`, `/demo` (interactive routing + demo form), `/faq`, `/request` (sample guest form)
- Dashboard (`/dashboard`): live overview, request inbox, housekeeping board, maintenance queue, department assignment, priority & escalation (editable rules + audit log), shift handover, operations assistant, recurring issues & feedback, properties, integrations status

## Demo script (≈3 minutes)
1. `/demo`: classify the “AC leaking (VIP)” sample; change the noise rule priority and re-run. Click through the staff decision.
2. `/dashboard/inbox` (as **Daniel Reyes**, Alder House): Room 412 is waiting, with an AI recommendation (Maintenance, urgent: VIP bump, SLA, reply draft). Click **Approve and create task**.
3. `/dashboard/maintenance`: the task appears, assigned to the least-loaded on-shift technician.
4. `/dashboard/escalations`: suggested escalations wait for a human; try declining one. Edit a rule (managers only).
5. `/dashboard/handover`: **Generate handover now**. The new task, blocked lift, past-SLA items, untriaged requests and recurring issues (Room 412 AC ×3, floor-3 hot water) are summarised.
6. Switch “Viewing as” to **Tomas** (housekeeping) and ask the assistant about maintenance: it declines. Switch to **Amara** for the three-property group view.
7. Optional: submit a request at `/request`, then open the inbox. It arrives for triage.

Reset any time with **Reset sample data**.

## Honest status
| Area | Status |
|---|---|
| Rules engine, dashboard, handover, assistant, analytics | Working (browser-held sample data) |
| Amazon Bedrock | Code written in `src/lib/bedrock.ts`; **never run against AWS** |
| PostgreSQL | `db/schema.sql` written; **not executed**; app doesn't connect |
| Amazon S3 attachments | Presign route validates then returns 501 without `S3_BUCKET`; **untested against S3** |
| AWS Lambda | Scaffold in `infra/`; **not built or deployed** |
| HubSpot | Plan only: [docs/HUBSPOT.md](docs/HUBSPOT.md). Demo form sends nothing |
| WhatsApp/SMS guest messaging, PMS, SSO/auth, sending guest replies | **Not built** |

Authentication is absent: “Viewing as” demonstrates role scoping only. Pricing is placeholder. No customer logos, testimonials or compliance certifications are claimed. Details and production blockers: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Layout
```
src/lib        rules, classifier, bedrock, handover, assistant, insights, permissions, store, sample data
src/app        website (site group), dashboard, API routes
db/schema.sql  PostgreSQL target schema
infra/         SAM template + Lambda scaffolds
docs/          architecture and HubSpot plan
```
