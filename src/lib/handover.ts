import { recurringIssues } from "./insights";
import { clockTime, dueIn, titleCase } from "./format";
import type { GuestRequest, HandoverReport, HandoverSection, Property, StaffMember, Task } from "./types";
import { priorityRank } from "./types";

export interface HandoverInput {
  property: Property;
  tasks: Task[]; // tasks of this property only
  requests: GuestRequest[]; // requests of this property only
  staff: StaffMember[];
  generatedBy: string;
  now?: number;
}

export function shiftLabel(now: number): string {
  const h = new Date(now).getHours();
  if (h >= 6 && h < 14) return "Morning → Afternoon";
  if (h >= 14 && h < 22) return "Afternoon → Night";
  return "Night → Morning";
}

const DEPT_LABEL = { reception: "Reception", housekeeping: "Housekeeping", maintenance: "Maintenance" } as const;

function line(t: Task, staff: StaffMember[], now: number): string {
  const who = staff.find((s) => s.id === t.assigneeId)?.name ?? "unassigned";
  const due = dueIn(t.dueAt, now);
  return `[${DEPT_LABEL[t.department]}] ${t.title} · ${t.priority}, ${titleCase(t.status)}, ${who}${due.overdue ? `, ${due.label}` : ""} (${t.id})`;
}

/**
 * Deterministic handover builder. Every line is derived from task/request records so the
 * report can be audited. Bedrock (when enabled) may only rewrite the `narrative` field
 * from these same facts; it never adds items.
 */
export function buildHandover(input: HandoverInput): HandoverReport {
  const now = input.now ?? Date.now();
  const active = input.tasks.filter((t) => t.status !== "done");
  const byPriority = (a: Task, b: Task) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueAt - b.dueAt;
  const priority = active.filter((t) => priorityRank(t.priority) >= priorityRank("high")).sort(byPriority);
  const overdue = active.filter((t) => t.dueAt < now).sort(byPriority);
  const escalated = active.filter((t) => t.escalated);
  const blocked = active.filter((t) => t.status === "blocked");
  const pendingEsc = active.filter((t) => t.escalationSuggested && !t.escalated && !t.escalationSuggestionDismissed);
  const unreviewed = input.requests.filter((r) => r.status === "new").sort((a, b) => a.receivedAt - b.receivedAt);
  const recurring = recurringIssues(input.tasks, now).slice(0, 4);
  const unassigned = active.filter((t) => !t.assigneeId);

  const sections: HandoverSection[] = [];
  const add = (title: string, items: string[]) => items.length && sections.push({ title, items });

  add("Priority issues", priority.slice(0, 8).map((t) => line(t, input.staff, now)));
  add("Escalated: managers are aware", escalated.map((t) => line(t, input.staff, now)));
  add(
    "Awaiting a manager's decision on escalation",
    pendingEsc.map((t) => `${t.title} (${t.id}): AI suggested escalation; no one has decided yet.`),
  );
  add("Past SLA", overdue.slice(0, 8).map((t) => line(t, input.staff, now)));
  add("Blocked", blocked.map((t) => `${t.title} (${t.id}): ${t.blockedReason ?? "no reason recorded"}`));
  add(
    "Guest requests not yet triaged",
    unreviewed.map((r) => {
      const c = r.classification;
      return `Room ${r.room}${r.vip ? " (VIP)" : ""}, waiting ${Math.round((now - r.receivedAt) / 60000)}m: "${r.message.slice(0, 110)}${r.message.length > 110 ? "…" : ""}" → suggested ${DEPT_LABEL[c.department]}, ${c.priority}${c.needsHumanTriage ? ", needs human triage" : ""}`;
    }),
  );
  add("Recurring issues to watch", recurring.map((r) => `${r.label}: ${r.note}`));

  const focus: string[] = [];
  if (unreviewed.length) focus.push(`Triage the ${unreviewed.length} waiting guest request${unreviewed.length > 1 ? "s" : ""} first.`);
  if (pendingEsc.length) focus.push(`Decide on ${pendingEsc.length} suggested escalation${pendingEsc.length > 1 ? "s" : ""}.`);
  if (unassigned.length) focus.push(`${unassigned.length} open task${unassigned.length > 1 ? "s have" : " has"} no assignee.`);
  const topRec = recurring[0];
  if (topRec) focus.push(`Inspect ${topRec.label.toLowerCase()} (${topRec.count} repeat reports).`);
  add("Suggested focus for the incoming shift (suggestions, not instructions)", focus);

  const urgent = active.filter((t) => t.priority === "urgent").length;
  const metrics = { open: active.length, urgent, overdue: overdue.length, escalated: escalated.length, unreviewedRequests: unreviewed.length };

  const headline = `${input.property.name}: ${metrics.open} open task${metrics.open === 1 ? "" : "s"}, ${metrics.overdue} past SLA, ${metrics.unreviewedRequests} request${metrics.unreviewedRequests === 1 ? "" : "s"} awaiting triage`;
  const top = priority[0];
  const narrative = [
    `At ${clockTime(now)} there ${metrics.open === 1 ? "is" : "are"} ${metrics.open} unresolved task${metrics.open === 1 ? "" : "s"} at ${input.property.name}, of which ${priority.length} ${priority.length === 1 ? "is" : "are"} high or urgent and ${metrics.overdue} ${metrics.overdue === 1 ? "is" : "are"} past SLA.`,
    unreviewed.length ? `${unreviewed.length} guest request${unreviewed.length > 1 ? "s are" : " is"} still waiting for triage.` : "The guest request inbox is clear.",
    top ? `Most pressing: ${top.title} (${top.id}).` : "",
    escalated.length ? `${escalated.length} item${escalated.length > 1 ? "s are" : " is"} already escalated to managers.` : "",
    recurring[0] ? `Recurring pattern: ${recurring[0].label}, ${recurring[0].count} reports.` : "",
  ].filter(Boolean).join(" ");

  return {
    id: `HO-${now.toString(36)}`,
    propertyId: input.property.id,
    generatedAt: now,
    generatedBy: input.generatedBy,
    shiftLabel: shiftLabel(now),
    headline,
    narrative,
    sections,
    metrics,
    source: "rules",
  };
}

export function handoverToText(r: HandoverReport, propertyName: string): string {
  const head = `SHIFT HANDOVER · ${propertyName} · ${r.shiftLabel} · ${new Date(r.generatedAt).toLocaleString()}\nPrepared by ${r.generatedBy}. Sample data.\n\n${r.headline}\n\n${r.narrative}\n`;
  return head + r.sections.map((s) => `\n${s.title.toUpperCase()}\n${s.items.map((i) => `- ${i}`).join("\n")}`).join("\n");
}
