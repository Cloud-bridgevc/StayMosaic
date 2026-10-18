"use client";

import { useState } from "react";
import { ago, titleCase } from "@/lib/format";
import { can, currentUser, visibleTasks } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { DEPARTMENTS, type DepartmentId, type Priority, type RoutingRule } from "@/lib/types";
import { PriorityBadge, SampleBadge } from "@/components/ui";
import { TaskLine } from "@/components/TaskParts";

function RuleRow({ r, editable }: { r: RoutingRule; editable: boolean }) {
  const { updateRule } = useOps();
  const [kw, setKw] = useState("");
  return (
    <tr style={{ opacity: r.enabled ? 1 : 0.55 }}>
      <td><strong>{r.name}</strong> {r.safetyCritical && <span className="badge b-danger">Safety</span>}<div className="xs muted">{r.keywords.slice(0, 6).join(", ")}{r.keywords.length > 6 ? ` +${r.keywords.length - 6}` : ""}</div>
        {editable && !r.safetyCritical && (
          <form className="row" style={{ marginTop: "0.3rem" }} onSubmit={(e) => { e.preventDefault(); const k = kw.trim().toLowerCase(); if (k && k.length <= 60 && !r.keywords.includes(k)) updateRule(r.id, { keywords: [...r.keywords, k] }); setKw(""); }}>
            <label className="sr-only" htmlFor={`kw-${r.id}`}>Add keyword</label>
            <input id={`kw-${r.id}`} type="text" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="add keyword" style={{ width: 130, padding: "0.2rem 0.4rem" }} />
            <button className="btn btn-sm">Add</button>
          </form>
        )}
      </td>
      <td>{editable ? (
        <select aria-label={`${r.name} department`} value={r.department} onChange={(e) => updateRule(r.id, { department: e.target.value as DepartmentId })}>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
      ) : titleCase(r.department)}</td>
      <td>{editable && !r.safetyCritical ? (
        <select aria-label={`${r.name} priority`} value={r.priority} onChange={(e) => updateRule(r.id, { priority: e.target.value as Priority })}>{["low", "normal", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}</select>
      ) : <PriorityBadge p={r.priority} />}</td>
      <td>{editable ? <input aria-label={`${r.name} SLA minutes`} type="number" min={1} max={10080} value={r.slaMinutes} style={{ width: 80 }} onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 10080) updateRule(r.id, { slaMinutes: v }); }} /> : `${r.slaMinutes}m`}</td>
      <td><label style={{ fontWeight: 400 }}><input type="checkbox" disabled={!editable} checked={r.suggestEscalation} onChange={(e) => updateRule(r.id, { suggestEscalation: e.target.checked })} /> suggest</label></td>
      <td><label style={{ fontWeight: 400 }}><input type="checkbox" disabled={!editable || r.safetyCritical} checked={r.enabled} onChange={(e) => updateRule(r.id, { enabled: e.target.checked })} /> on</label></td>
    </tr>
  );
}

export default function Escalations() {
  const { state, now, escalateTask, dismissEscalation, updateSettings } = useOps();
  const user = currentUser(state);
  const editable = can(user, "edit_rules");
  const tasks = visibleTasks(state).filter((t) => t.status !== "done");
  const pending = tasks.filter((t) => t.escalationSuggested && !t.escalated && !t.escalationSuggestionDismissed);
  const escalated = tasks.filter((t) => t.escalated);
  const audit = state.audit.slice(0, 10);

  return (
    <>
      <div className="page-head row-between"><div><h1>Priority and escalation</h1><p className="muted">The AI suggests; only authorised staff escalate. Rules below define what it may suggest.</p></div><SampleBadge /></div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Awaiting a decision ({pending.length})</h3>
        {pending.length === 0 && <p className="muted small">No suggested escalations are waiting.</p>}
        {pending.map((t) => (
          <div key={t.id} style={{ marginBottom: "0.7rem" }}>
            <TaskLine t={t} />
            {can(user, "escalate", t) ? (
              <div className="row" style={{ marginTop: "0.4rem" }}>
                <button className="btn btn-danger btn-sm" onClick={() => escalateTask(t.id)}>Escalate to duty manager</button>
                <button className="btn btn-sm" onClick={() => dismissEscalation(t.id)}>Decline suggestion</button>
              </div>
            ) : <p className="xs muted">Your role can’t escalate this task.</p>}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Escalated ({escalated.length})</h3>
        {escalated.length === 0 ? <p className="muted small">None.</p> : escalated.map((t) => <TaskLine key={t.id} t={t} />)}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="row-between"><h3>Routing rules</h3>{!editable && <span className="xs muted">Managers can edit rules.</span>}</div>
        <div className="row" style={{ marginBottom: "0.6rem" }}>
          <label style={{ fontWeight: 400 }}><input type="checkbox" disabled={!editable} checked={state.settings.vipPriorityBump} onChange={(e) => updateSettings({ vipPriorityBump: e.target.checked })} /> Raise priority one level for VIP guests</label>
          <label style={{ fontWeight: 400 }}>Needs-human-triage below confidence{" "}
            <input type="number" disabled={!editable} min={0.1} max={0.95} step={0.05} value={state.settings.minConfidenceToRecommend} style={{ width: 80 }} onChange={(e) => { const v = Number(e.target.value); if (v >= 0.1 && v <= 0.95) updateSettings({ minConfidenceToRecommend: v }); }} /></label>
        </div>
        <p className="xs muted">Locked by design: staff approval of tasks, staff-only escalation, draft-only guest replies. Safety rules can’t be disabled or downgraded.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Rule</th><th>Department</th><th>Priority</th><th>SLA</th><th>Escalation</th><th>Enabled</th></tr></thead>
          <tbody>{state.rules.map((r) => <RuleRow key={r.id} r={r} editable={editable} />)}</tbody>
        </table></div>
      </div>

      <div className="card">
        <h3>Audit log</h3>
        {audit.map((a) => <div key={a.id} className="small" style={{ padding: "0.25rem 0" }}><span className="muted">{ago(a.at, now)}</span> · <strong>{a.actor}</strong> · {titleCase(a.action)}: {a.detail}</div>)}
      </div>
    </>
  );
}
