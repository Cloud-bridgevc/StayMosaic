# HubSpot integration plan

**Status: planned, not built.** The website demo form validates input and returns `202` with `hubspot: "not_connected"`. Nothing is sent to HubSpot and nothing is stored.

## Goals
1. Capture hotel-group prospects from the website.
2. Let prospects book a demo.
3. Track the sales pipeline.
4. Automate onboarding once a deal is won.

## Objects and properties
| HubSpot object | Source | Custom properties to create |
|---|---|---|
| Contact | Demo form | `sm_role`, `sm_consent_at`, `sm_lead_source` |
| Company | Demo form | `sm_property_count`, `sm_property_type` (hotel / serviced_apartment / both), `sm_pms_vendor` |
| Deal | Created on demo booking | `sm_properties_in_scope`, `sm_go_live_target` |
| Ticket (onboarding) | Created on Closed Won | `sm_property_id` (links to StayMosaic organisation) |

## Pipeline: "StayMosaic Hotel Groups"
`New lead` → `Demo booked` → `Demo held` → `Pilot (1 property)` → `Proposal` → `Closed won` / `Closed lost`

## Flow
1. **Form submit.** `POST /api/demo-request` validates, then (when enabled) submits to the HubSpot Forms API (`/submissions/v3/integration/submit/{portalId}/{formGuid}`) with the consent text and `legalConsentOptions`. This endpoint needs no private token.
2. **Demo booking.** Embed the HubSpot Meetings link after submission. A meeting booking moves the deal to `Demo booked`.
3. **Pipeline automation (HubSpot workflows).** Assign owner by `sm_property_count` (1–3 vs 4+), create follow-up tasks, send internal Slack/email alerts.
4. **Onboarding automation.** On `Closed won`, a HubSpot webhook calls an API Gateway + Lambda endpoint (signature verified with the app secret) that:
   - creates the StayMosaic organisation and property records in PostgreSQL,
   - seeds the default rule set for the property type,
   - creates an onboarding ticket with a checklist (rules workshop, staff roster import, guest form embed, handover schedule),
   - writes the StayMosaic organisation ID back to the HubSpot company.

## Requirements before building
- HubSpot portal and a private app token stored in AWS Secrets Manager (never in the browser).
- Privacy policy and consent wording approved; honour opt-out and deletion requests.
- Idempotent webhook handling (HubSpot retries) and a DLQ.
- Sales contact address published on the website (the form currently tells visitors nothing is sent).

## Out of scope for the first release
Two-way sync of product usage into HubSpot, billing, and lead scoring.
