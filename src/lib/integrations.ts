export type IntegrationStatus = "demo" | "ready_unconnected" | "planned" | "not_operational";

export interface Integration {
  id: string;
  name: string;
  purpose: string;
  status: IntegrationStatus;
  detail: string;
}

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  demo: "Running in demo mode",
  ready_unconnected: "Code ready · not connected",
  planned: "Planned",
  not_operational: "Not operational",
};

/** Honest status of every external dependency. Shown in the dashboard and the README. */
export const INTEGRATIONS: Integration[] = [
  { id: "classifier", name: "Rules engine", purpose: "Request classification and routing against configurable hotel rules.", status: "demo", detail: "Operational. This is what powers every classification in this build." },
  { id: "bedrock", name: "Amazon Bedrock", purpose: "Request classification and operational summaries.", status: "ready_unconnected", detail: "Server code is written (src/lib/bedrock.ts) but has not been run against a real AWS account. Set BEDROCK_MODEL_ID and AWS credentials to enable. Until then the rules engine answers." },
  { id: "postgres", name: "PostgreSQL", purpose: "Tasks, requests, rules, properties and audit log.", status: "ready_unconnected", detail: "Schema is in db/schema.sql. This build keeps sample data in the browser (localStorage) and does not connect to a database." },
  { id: "s3", name: "Amazon S3", purpose: "Guest photo and PDF attachments.", status: "ready_unconnected", detail: "Presigned-upload route exists (/api/attachments/presign) and validates type and size, but returns 501 until S3_BUCKET is configured." },
  { id: "lambda", name: "AWS Lambda", purpose: "Background workflows: queued classification, scheduled handovers, SLA checks.", status: "ready_unconnected", detail: "Handler sources and a SAM template are in infra/. They have not been deployed or run." },
  { id: "hubspot", name: "HubSpot", purpose: "Prospect management, demo booking, pipeline tracking, onboarding automation.", status: "planned", detail: "Design only (docs/HUBSPOT.md). The website demo form validates input but sends nothing to HubSpot." },
  { id: "messaging", name: "Guest messaging (WhatsApp / SMS)", purpose: "Receive guest requests through an authorised messaging channel.", status: "not_operational", detail: "Not built. Requests labelled “messaging (simulated)” are sample data. A real integration needs a provider account, guest opt-in and template approval." },
  { id: "pms", name: "Property management system", purpose: "Room status, guest profiles and VIP flags.", status: "planned", detail: "Not built. VIP flags and room data in this build are sample values." },
  { id: "auth", name: "Authentication and SSO", purpose: "Verified staff identity and role-based access.", status: "not_operational", detail: "The “Viewing as” selector is a demo of role scoping, not authentication." },
  { id: "guest_sms", name: "Guest replies", purpose: "Sending reply drafts to guests.", status: "not_operational", detail: "Drafts are generated for staff review. Nothing is sent to guests from this build." },
];
