"use client";

import { useState } from "react";
import { titleCase } from "@/lib/format";
import { currentUser, visibleTasks } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { priorityRank } from "@/lib/types";
import { TaskLine } from "@/components/TaskParts";
import { SampleBadge } from "@/components/ui";

export default function Maintenance() {
  const { state } = useOps();
  const [filter, setFilter] = useState<"active" | "blocked" | "unassigned" | "done">("active");
  const user = currentUser(state);
  if (!user.departments.includes("maintenance")) return <div className="card">Your role doesn’t include maintenance.</div>;
  const all = visibleTasks(state).filter((t) => t.department === "maintenance");
  const f = {
    active: (t: (typeof all)[0]) => t.status !== "done",
    blocked: (t: (typeof all)[0]) => t.status === "blocked",
    unassigned: (t: (typeof all)[0]) => t.status !== "done" && !t.assigneeId,
    done: (t: (typeof all)[0]) => t.status === "done",
  }[filter];
  const items = all.filter(f).sort((a, b) => (filter === "done" ? (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0) : priorityRank(b.priority) - priorityRank(a.priority) || a.dueAt - b.dueAt));
  return (
    <>
      <div className="page-head row-between"><div><h1>Maintenance queue</h1><p className="muted">Ranked by priority, then SLA deadline.</p></div><SampleBadge /></div>
      <div className="tabs" role="group" aria-label="Filter" style={{ marginBottom: "1rem" }}>
        {(["active", "unassigned", "blocked", "done"] as const).map((k) => (
          <button key={k} className="chip-btn" aria-pressed={filter === k} onClick={() => setFilter(k)}>{titleCase(k)} ({all.filter({ active: (t: (typeof all)[0]) => t.status !== "done", blocked: (t: (typeof all)[0]) => t.status === "blocked", unassigned: (t: (typeof all)[0]) => t.status !== "done" && !t.assigneeId, done: (t: (typeof all)[0]) => t.status === "done" }[k]).length})</button>
        ))}
      </div>
      {items.length === 0 ? <div className="card muted">Nothing here.</div> : items.map((t) => <TaskLine key={t.id} t={t} showProperty={state.selectedPropertyId === "all"} />)}
    </>
  );
}
