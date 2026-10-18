"use client";

import { can, currentUser, scopeIds, visibleTasks } from "@/lib/permissions";
import { suggestAssignee, useOps } from "@/lib/store";
import { DEPARTMENTS } from "@/lib/types";
import { PriorityBadge, SampleBadge } from "@/components/ui";

export default function Departments() {
  const { state, assignTask } = useOps();
  const user = currentUser(state);
  const ids = scopeIds(state);
  const tasks = visibleTasks(state).filter((t) => t.status !== "done");
  const staff = state.staff.filter((s) => ids.includes(s.propertyId) && user.departments.includes(s.department));
  const load = (id: string) => tasks.filter((t) => t.assigneeId === id).length;

  return (
    <>
      <div className="page-head row-between"><div><h1>Department assignment</h1><p className="muted">Workload by person, and open tasks waiting for an owner.</p></div><SampleBadge /></div>
      {DEPARTMENTS.filter((d) => user.departments.includes(d.id)).map((d) => {
        const team = staff.filter((s) => s.department === d.id);
        const unassigned = tasks.filter((t) => t.department === d.id && !t.assigneeId);
        return (
          <div className="card" key={d.id} style={{ marginBottom: "1rem" }}>
            <h3>{d.label}</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Team member</th><th>Property</th><th>Status</th><th>Open tasks</th></tr></thead>
              <tbody>{team.map((s) => (
                <tr key={s.id}><td>{s.name}</td><td>{state.properties.find((p) => p.id === s.propertyId)?.name}</td><td><span className={`badge ${s.onShift ? "b-ok" : ""}`}>{s.onShift ? "On shift" : "Off shift"}</span></td><td>{load(s.id)}</td></tr>
              ))}</tbody>
            </table></div>
            <h3 style={{ marginTop: "1rem", fontSize: "1rem" }}>Unassigned ({unassigned.length})</h3>
            {unassigned.length === 0 && <p className="small muted">Everything has an owner.</p>}
            {unassigned.map((t) => {
              const rec = suggestAssignee(state, t.propertyId, t.department);
              const pool = state.staff.filter((s) => s.propertyId === t.propertyId && s.department === t.department);
              const allowed = can(user, "assign", t);
              return (
                <div key={t.id} className="item row-between">
                  <div><strong>{t.title}</strong> <PriorityBadge p={t.priority} /><div className="xs muted">{t.id} · recommended: {state.staff.find((s) => s.id === rec)?.name ?? "no one on shift"} (least loaded on-shift)</div></div>
                  {allowed ? (
                    <div className="row">
                      <label className="sr-only" htmlFor={`as-${t.id}`}>Assign {t.title}</label>
                      <select id={`as-${t.id}`} style={{ width: "auto" }} defaultValue="" onChange={(e) => e.target.value && assignTask(t.id, e.target.value)}>
                        <option value="">Assign to…</option>
                        {pool.map((s) => <option key={s.id} value={s.id}>{s.name}{s.onShift ? "" : " (off shift)"}</option>)}
                      </select>
                      {rec && <button className="btn btn-sm" onClick={() => assignTask(t.id, rec)}>Use recommendation</button>}
                    </div>
                  ) : <span className="xs muted">Supervisors and managers assign.</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
