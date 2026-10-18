"use client";

import { dueIn } from "@/lib/format";
import { visibleTasks } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { priorityRank, type TaskStatus } from "@/lib/types";
import { PriorityBadge, SampleBadge } from "@/components/ui";
import { TaskActions, useStaffName, propertyName } from "@/components/TaskParts";

const COLS: { s: TaskStatus; label: string }[] = [
  { s: "open", label: "To do" }, { s: "in_progress", label: "In progress" }, { s: "blocked", label: "Blocked" }, { s: "done", label: "Done" },
];

export default function Housekeeping() {
  const { state, now } = useOps();
  const who = useStaffName();
  const tasks = visibleTasks(state).filter((t) => t.department === "housekeeping");
  if (!state.users.find((u) => u.id === state.currentUserId)?.departments.includes("housekeeping")) return <div className="card">Your role doesn’t include housekeeping.</div>;
  return (
    <>
      <div className="page-head row-between"><div><h1>Housekeeping board</h1><p className="muted">Turnovers, re-cleans and linen requests.</p></div><SampleBadge /></div>
      <div className="board">
        {COLS.map((c) => {
          const items = tasks.filter((t) => t.status === c.s).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueAt - b.dueAt);
          return (
            <section key={c.s} className="col" aria-label={c.label}>
              <h3>{c.label}<span>{items.length}</span></h3>
              {items.map((t) => {
                const d = dueIn(t.dueAt, now);
                return (
                  <div key={t.id} className="kcard">
                    <div className="t">{t.title}</div>
                    <div className="row"><PriorityBadge p={t.priority} />{t.source === "guest_request" && <span className="badge b-ai">Guest request</span>}</div>
                    <div className="xs muted" style={{ margin: "0.3rem 0" }}>{who(t.assigneeId)}{state.selectedPropertyId === "all" ? ` · ${propertyName(state.properties, t.propertyId)}` : ""}{c.s !== "done" && <> · <span style={d.overdue ? { color: "var(--danger)", fontWeight: 700 } : undefined}>{d.label}</span></>}</div>
                    {t.blockedReason && <div className="xs" style={{ color: "var(--warn)" }}>{t.blockedReason}</div>}
                    <TaskActions t={t} />
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
