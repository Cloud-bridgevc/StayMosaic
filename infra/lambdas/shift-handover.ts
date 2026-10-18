/**
 * SCAFFOLD: not deployed, not run. Scheduled by EventBridge shortly before shift change.
 * Builds the handover from database records (same builder as the web app), optionally lets
 * Bedrock rewrite only the narrative, and stores the report for staff to review.
 */
import { summarise } from "../../src/lib/bedrock";
import { buildHandover } from "../../src/lib/handover";
import { db } from "./db";

export const handler = async (): Promise<{ generated: number }> => {
  const pool = await db();
  const { rows: props } = await pool.query("SELECT id, name, kind AS type, city, units FROM properties");
  let generated = 0;
  for (const property of props) {
    const [tasks, requests, staff] = await Promise.all([
      pool.query("SELECT * FROM tasks WHERE property_id = $1 AND (status <> 'done' OR resolved_at > now() - interval '12 hours')", [property.id]),
      pool.query("SELECT * FROM guest_requests WHERE property_id = $1 AND status = 'new'", [property.id]),
      pool.query("SELECT s.id, s.name, s.department FROM staff s JOIN staff_access a ON a.staff_id = s.id WHERE a.property_id = $1 AND s.active", [property.id]),
    ]);
    // NOTE: rows need mapping from snake_case to the Task/GuestRequest shapes (omitted in this scaffold).
    const report = buildHandover({ property, tasks: tasks.rows.map(toTask), requests: requests.rows.map(toRequest), staff: staff.rows.map((s) => ({ ...s, propertyId: property.id, onShift: true })), generatedBy: "Scheduled handover" });
    const prose = await summarise("You write a calm, concise shift-handover opening paragraph.", { headline: report.headline, metrics: report.metrics });
    if (prose) { report.narrative = prose; report.source = "bedrock"; }
    await pool.query("INSERT INTO handover_reports (property_id, shift_label, source, report) VALUES ($1,$2,$3,$4)", [property.id, report.shiftLabel, report.source, report]);
    generated++;
  }
  return { generated };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const toTask = (r: any) => ({
  id: r.id, propertyId: r.property_id, requestId: r.request_id, source: r.source, department: r.department, category: r.category,
  title: r.title, detail: r.detail, room: r.room, priority: r.priority, status: r.status, assigneeId: r.assignee_id,
  createdAt: +new Date(r.created_at), dueAt: +new Date(r.due_at), resolvedAt: r.resolved_at ? +new Date(r.resolved_at) : undefined,
  escalated: r.escalated, escalationSuggested: r.escalation_suggested, escalationSuggestionDismissed: r.escalation_suggestion_dismissed,
  blockedReason: r.blocked_reason, aiRecommended: r.ai_recommended,
});
const toRequest = (r: any) => ({
  id: r.id, propertyId: r.property_id, guestName: r.guest_name, room: r.room, vip: r.vip, channel: r.channel, message: r.message,
  receivedAt: +new Date(r.received_at), status: r.status, classification: r.ai_payload,
});
