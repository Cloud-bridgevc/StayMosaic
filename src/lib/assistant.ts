import { bottlenecks, departmentLoad, feedbackThemes, recurringIssues } from "./insights";
import { dueIn, titleCase } from "./format";
import type { DemoUser, DepartmentId, GuestRequest, Property, Review, StaffMember, Task } from "./types";
import { priorityRank } from "./types";

export interface AssistantContext {
  user: DemoUser;
  properties: Property[]; // all properties (used only to detect out-of-scope names)
  tasks: Task[]; // ALL tasks; scoping is applied here so authorization lives in one place
  requests: GuestRequest[];
  reviews: Review[];
  staff: StaffMember[];
  now?: number;
}

export interface AssistantAnswer {
  answer: string;
  lines: string[];
  sources: string[];
  refused?: boolean;
}

const DEPT_WORDS: Record<DepartmentId, string[]> = {
  housekeeping: ["housekeeping", "cleaning", "linen"],
  maintenance: ["maintenance", "engineering", "repair", "repairs"],
  reception: ["reception", "front desk", "frontdesk"],
};

const t2line = (t: Task, staff: StaffMember[], now: number) => {
  const who = staff.find((s) => s.id === t.assigneeId)?.name ?? "unassigned";
  const d = dueIn(t.dueAt, now);
  return `${t.id} · ${t.title} · ${t.priority} · ${titleCase(t.status)} · ${who} · ${d.label}`;
};

/**
 * Rule-based, read-only question answering over records the user is authorised to see.
 * Answers cite task ids. Bedrock (if enabled) may rephrase this output; it receives only
 * already-authorised facts, never the full database.
 */
export function answerQuestion(question: string, ctx: AssistantContext): AssistantAnswer {
  const now = ctx.now ?? Date.now();
  const q = question.toLowerCase();
  const u = ctx.user;

  // 1. Refuse actions: the assistant is advisory and read-only.
  if (/\b(escalate|send|message|text|email|refund|compensat|delete|assign|close|cancel|approve)\b/.test(q) && /\b(please|can you|could you|go ahead|do it|now)\b|^(escalate|send|assign|close|approve|delete)/.test(q)) {
    return {
      answer: "I can't take actions. Escalation, assignments and guest messages stay with your team. I can show you what needs a decision.",
      lines: ["Use the Escalations page to escalate, the Inbox to approve or edit task routing, and the Department assignment page to assign work."],
      sources: [], refused: true,
    };
  }

  // 2. Authorisation: out-of-scope properties and departments are refused, not silently filtered.
  for (const p of ctx.properties) {
    const named = q.includes(p.name.toLowerCase()) || q.includes(p.name.split(" ")[0].toLowerCase());
    if (named && !u.propertyIds.includes(p.id)) {
      return { answer: `You don't have access to ${p.name}.`, lines: [], sources: [], refused: true };
    }
  }
  const askedDepts = (Object.keys(DEPT_WORDS) as DepartmentId[]).filter((d) => DEPT_WORDS[d].some((w) => q.includes(w)));
  const blockedDept = askedDepts.find((d) => !u.departments.includes(d));
  if (blockedDept) {
    return { answer: `Your role doesn't include ${titleCase(blockedDept)} tasks.`, lines: [], sources: [], refused: true };
  }

  const tasks = ctx.tasks.filter((t) => u.propertyIds.includes(t.propertyId) && u.departments.includes(t.department));
  const reqs = ctx.requests.filter((r) => u.propertyIds.includes(r.propertyId));
  const active = tasks.filter((t) => t.status !== "done");
  const deptFilter = (ts: Task[]) => (askedDepts.length ? ts.filter((t) => askedDepts.includes(t.department)) : ts);
  const sort = (a: Task, b: Task) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueAt - b.dueAt;
  const list = (ts: Task[], n = 8) => ts.sort(sort).slice(0, n);
  const result = (answer: string, ts: Task[], extra: string[] = []): AssistantAnswer => ({
    answer,
    lines: [...ts.map((t) => t2line(t, ctx.staff, now)), ...extra],
    sources: ts.map((t) => t.id),
  });

  const roomMatch = q.match(/room\s*(\d{1,4})|apt\.?\s*(\d+)|apartment\s*(\d+)|suite\s*(\d+)/);
  if (roomMatch) {
    const room = roomMatch[1] ?? roomMatch[2] ?? roomMatch[3] ?? roomMatch[4];
    const hits = tasks.filter((t) => t.room === room || t.room.toLowerCase().endsWith(` ${room}`));
    if (!hits.length) return { answer: `No tasks found for ${roomMatch[0]} in the records you can see.`, lines: [], sources: [] };
    const ordered = hits.sort((a, b) => b.createdAt - a.createdAt);
    return result(`${roomMatch[0]} has ${hits.length} task${hits.length > 1 ? "s" : ""} on record (${hits.filter((t) => t.status !== "done").length} open).`, ordered.slice(0, 8));
  }

  if (/recurr|repeat|pattern|again|keeps? (happening|coming)/.test(q)) {
    const rec = recurringIssues(tasks, now);
    if (!rec.length) return { answer: "No recurring issues in the last 14 days.", lines: [], sources: [] };
    return { answer: `${rec.length} recurring pattern${rec.length > 1 ? "s" : ""} in the last 14 days. The strongest is ${rec[0].label} (${rec[0].count} reports).`, lines: rec.slice(0, 6).map((r) => `${r.label} · ${titleCase(r.category)} · ${r.count} reports. ${r.note}`), sources: rec.flatMap((r) => r.taskIds).slice(0, 12) };
  }

  if (/bottleneck|backlog|slow|capacity|workload|stretched|busy/.test(q)) {
    const load = departmentLoad(tasks, ctx.staff.filter((s) => u.propertyIds.includes(s.propertyId)), now).filter((l) => u.departments.includes(l.department));
    const b = bottlenecks(load);
    return {
      answer: b.length ? `${b.length} bottleneck signal${b.length > 1 ? "s" : ""} right now.` : "No department is showing a bottleneck right now.",
      lines: [
        ...b.map((x) => `${titleCase(x.department)} (${x.severity}): ${x.text}`),
        ...load.map((l) => `${titleCase(l.department)}: ${l.open} open, ${l.overdue} past SLA, ${l.onShift} on shift${l.medianResolveMin !== null ? `, median resolution ${l.medianResolveMin}m` : ""}`),
      ],
      sources: [],
    };
  }

  if (/feedback|review|guests? (are )?saying|theme|sentiment|complain/.test(q)) {
    const rv = ctx.reviews.filter((r) => u.propertyIds.includes(r.propertyId));
    const th = feedbackThemes(rv, tasks, reqs, now).slice(0, 5);
    return {
      answer: th.length ? `Top feedback theme: ${th[0].theme.label} (${th[0].negative} negative of ${th[0].reviews} mentions, ${th[0].opsTasks} related tasks).` : "No feedback themes found.",
      lines: th.map((s) => `${s.theme.label}: ${s.reviews} reviews, avg ${s.avgRating || "n/a"}★, ${s.negative} negative, ${s.opsTasks} related tasks (${s.trend})`),
      sources: [],
    };
  }

  if (/overdue|late|sla|breach|past due/.test(q)) {
    const ts = deptFilter(active.filter((t) => t.dueAt < now));
    return result(ts.length ? `${ts.length} task${ts.length > 1 ? "s are" : " is"} past SLA.` : "Nothing is past SLA.", list(ts));
  }
  if (/unassigned|no one|nobody|not assigned/.test(q)) {
    const ts = deptFilter(active.filter((t) => !t.assigneeId));
    return result(`${ts.length} open task${ts.length === 1 ? " has" : "s have"} no assignee.`, list(ts));
  }
  if (/blocked|stuck|waiting/.test(q)) {
    const ts = deptFilter(active.filter((t) => t.status === "blocked"));
    return result(`${ts.length} blocked task${ts.length === 1 ? "" : "s"}.`, list(ts), ts.map((t) => `${t.id} blocked: ${t.blockedReason ?? "no reason recorded"}`));
  }
  if (/escalat/.test(q)) {
    const done = active.filter((t) => t.escalated);
    const pending = active.filter((t) => t.escalationSuggested && !t.escalated && !t.escalationSuggestionDismissed);
    return result(`${done.length} escalated, ${pending.length} awaiting a manager's decision.`, [...list(done), ...list(pending)]);
  }
  if (/urgent|priority|high|important|critical/.test(q)) {
    const ts = deptFilter(active.filter((t) => priorityRank(t.priority) >= priorityRank("high")));
    return result(`${ts.length} high or urgent open task${ts.length === 1 ? "" : "s"}.`, list(ts));
  }
  if (/inbox|waiting|triage|new request|unreviewed/.test(q)) {
    const rs = reqs.filter((r) => r.status === "new");
    return { answer: `${rs.length} guest request${rs.length === 1 ? " is" : "s are"} waiting for triage.`, lines: rs.map((r) => `${r.id} · Room ${r.room} · suggested ${titleCase(r.classification.department)}/${r.classification.priority}`), sources: rs.map((r) => r.id) };
  }
  if (askedDepts.length || /open|task|todo|what('| i)s/.test(q)) {
    const ts = deptFilter(active);
    return result(`${ts.length} open task${ts.length === 1 ? "" : "s"}${askedDepts.length ? ` in ${askedDepts.map(titleCase).join(", ")}` : ""}.`, list(ts, 10));
  }

  return {
    answer: "I can answer questions about open, overdue, urgent, unassigned, blocked and escalated tasks, recurring issues, bottlenecks, a specific room, and guest feedback themes.",
    lines: ["Try: “What is overdue?”, “Any recurring issues?”, “What is blocked in maintenance?”, “What happened in room 412?”"],
    sources: [],
  };
}

export const SUGGESTED_QUESTIONS = [
  "What is overdue right now?",
  "Any recurring issues this fortnight?",
  "Where are the bottlenecks?",
  "What is blocked in maintenance?",
  "What happened in room 412?",
  "What are guests saying in reviews?",
  "Which tasks are unassigned?",
];
