"use client";

import { dueIn, ago } from "@/lib/format";
import { can, currentUser } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import type { Task, TaskStatus } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "./ui";

export function useStaffName() {
  const { state } = useOps();
  return (id?: string) => state.staff.find((s) => s.id === id)?.name ?? "Unassigned";
}

export function propertyName(props: { id: string; name: string }[], id: string) {
  return props.find((p) => p.id === id)?.name ?? id;
}

const NEXT: Record<TaskStatus, TaskStatus | null> = { open: "in_progress", in_progress: "done", blocked: "in_progress", done: null };

export function TaskActions({ t }: { t: Task }) {
  const { state, updateTask } = useOps();
  const user = currentUser(state);
  if (!can(user, "update_task", t)) return null;
  const next = NEXT[t.status];
  return (
    <div className="row">
      {next && <button className="btn btn-sm" onClick={() => updateTask(t.id, { status: next })}>{next === "done" ? "Mark done" : t.status === "blocked" ? "Unblock" : "Start"}</button>}
      {t.status !== "blocked" && t.status !== "done" && (
        <button className="btn btn-sm" onClick={() => { const r = prompt("Why is this blocked? (parts, access, approval…)"); if (r?.trim()) updateTask(t.id, { status: "blocked", blockedReason: r.trim().slice(0, 200) }); }}>Block</button>
      )}
      {t.status === "done" && <button className="btn btn-sm" onClick={() => updateTask(t.id, { status: "open" })}>Reopen</button>}
    </div>
  );
}

export function TaskLine({ t, showProperty }: { t: Task; showProperty?: boolean }) {
  const { state, now } = useOps();
  const who = useStaffName();
  const due = dueIn(t.dueAt, now);
  const prop = showProperty ? propertyName(state.properties, t.propertyId) : null;
  return (
    <div className={`item ${t.priority === "urgent" ? "urgent" : t.priority === "high" ? "high" : ""}`}>
      <div className="row-between">
        <strong>{t.title}</strong>
        <div className="row"><PriorityBadge p={t.priority} /><StatusBadge s={t.status} />{t.escalated && <span className="badge b-danger">Escalated</span>}</div>
      </div>
      <div className="xs muted" style={{ marginTop: "0.25rem" }}>
        {t.id} · {prop ? `${prop} · ` : ""}{who(t.assigneeId)} · created {ago(t.createdAt, now)} · {t.status === "done" ? "resolved" : <span style={due.overdue ? { color: "var(--danger)", fontWeight: 700 } : undefined}>{due.label}</span>}
      </div>
      {t.blockedReason && <div className="small" style={{ color: "var(--warn)", marginTop: "0.3rem" }}>Blocked: {t.blockedReason}</div>}
      <div style={{ marginTop: "0.5rem" }}><TaskActions t={t} /></div>
    </div>
  );
}
