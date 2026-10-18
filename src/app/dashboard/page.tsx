"use client";

import Link from "next/link";
import { bottlenecks, departmentLoad } from "@/lib/insights";
import { currentUser, scopeIds, visibleRequests, visibleTasks } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { priorityRank, DEPARTMENTS } from "@/lib/types";
import { TaskLine } from "@/components/TaskParts";

export default function Overview() {
  const { state, now } = useOps();
  const user = currentUser(state);
  const tasks = visibleTasks(state);
  const active = tasks.filter((t) => t.status !== "done");
  const overdue = active.filter((t) => t.dueAt < now);
  const waiting = visibleRequests(state).filter((r) => r.status === "new");
  const pendingEsc = active.filter((t) => t.escalationSuggested && !t.escalated && !t.escalationSuggestionDismissed);
  const staff = state.staff.filter((s) => scopeIds(state).includes(s.propertyId));
  const load = departmentLoad(tasks, staff, now).filter((l) => user.departments.includes(l.department));
  const signals = bottlenecks(load);
  const top = active.filter((t) => priorityRank(t.priority) >= 2).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueAt - b.dueAt).slice(0, 5);

  const stats = [
    { v: active.length, l: "Open tasks" },
    { v: overdue.length, l: "Past SLA", alert: overdue.length > 0 },
    { v: waiting.length, l: "Requests to triage", alert: waiting.length > 0 },
    { v: pendingEsc.length, l: "Escalation decisions" },
  ];

  return (
    <>
      <div className="page-head"><h1>Live operations</h1><p className="muted">Good to see you, {user.name.split(" ")[0]}. Here is where the shift stands.</p></div>
      <div className="grid g4">
        {stats.map((s) => (
          <div key={s.l} className={`card stat ${s.alert ? "alert" : ""}`}><div className="v">{s.v}</div><div className="l">{s.l}</div></div>
        ))}
      </div>

      <div className="grid g2" style={{ marginTop: "1rem", alignItems: "start" }}>
        <div className="card">
          <div className="row-between"><h3>Needs attention</h3><Link href="/dashboard/inbox" className="small">Open inbox</Link></div>
          {top.length === 0 ? <p className="muted">No high-priority open tasks.</p> : top.map((t) => <TaskLine key={t.id} t={t} showProperty={state.selectedPropertyId === "all"} />)}
        </div>
        <div className="stack">
          <div className="card">
            <h3>Department load</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Department</th><th>Open</th><th>Past SLA</th><th>Blocked</th><th>On shift</th></tr></thead>
              <tbody>{load.map((l) => (
                <tr key={l.department}><td>{DEPARTMENTS.find((d) => d.id === l.department)?.label}</td><td>{l.open}</td><td style={l.overdue ? { color: "var(--danger)", fontWeight: 700 } : undefined}>{l.overdue}</td><td>{l.blocked}</td><td>{l.onShift}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
          <div className="card">
            <h3>Bottleneck signals</h3>
            {signals.length === 0 ? <p className="muted small">None right now.</p> : signals.map((b, i) => (
              <div key={i} className="small" style={{ marginBottom: "0.4rem" }}><span className={`badge ${b.severity === "act" ? "b-danger" : "b-warn"}`}>{b.severity === "act" ? "Act" : "Watch"}</span> <strong>{DEPARTMENTS.find((d) => d.id === b.department)?.label}</strong>: {b.text}</div>
            ))}
          </div>
          <div className="card" style={{ background: "var(--gold-soft)", borderColor: "#e0cf9f" }}>
            <h3>Guided demo story</h3>
            <ol className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>Open the <Link href="/dashboard/inbox">Request inbox</Link>: Room 412 (VIP) reports a leaking AC.</li>
              <li>Review the AI recommendation, then approve it. A maintenance task is created and assigned.</li>
              <li>Check the <Link href="/dashboard/maintenance">Maintenance queue</Link> for the new task.</li>
              <li>Generate a <Link href="/dashboard/handover">shift handover</Link> that includes it.</li>
              <li>Or submit your own via the <Link href="/request">guest form</Link>.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
