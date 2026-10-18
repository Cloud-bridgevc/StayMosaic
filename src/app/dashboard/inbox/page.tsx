"use client";

import { useState } from "react";
import { ago, titleCase } from "@/lib/format";
import { can, currentUser, visibleRequests } from "@/lib/permissions";
import { suggestAssignee, useOps } from "@/lib/store";
import { DEPARTMENTS, type DepartmentId, type GuestRequest, type Priority } from "@/lib/types";
import { Confidence, EngineBadge, PriorityBadge, SampleBadge } from "@/components/ui";

const SIM = [
  { room: "315", guest: "Nora Fitch", msg: "No hot water in the shower this morning, and the bathroom light flickers." },
  { room: "402", guest: "Ravi Menon", msg: "Please could housekeeping make up the room, it hasn't been cleaned today." },
  { room: "118", guest: "Elise Moreau", msg: "I think I'm feeling unwell and need a doctor." },
];

function RequestCard({ r }: { r: GuestRequest }) {
  const { state, now, approveRequest, dismissRequest } = useOps();
  const user = currentUser(state);
  const c = r.classification;
  const canTriage = can(user, "triage");
  const [editing, setEditing] = useState(false);
  const [dept, setDept] = useState<DepartmentId>(c.department);
  const [pri, setPri] = useState<Priority>(c.priority);
  const [assignee, setAssignee] = useState<string>(suggestAssignee(state, r.propertyId, c.department) ?? "");
  const pool = state.staff.filter((s) => s.propertyId === r.propertyId && s.department === dept);
  const prop = state.properties.find((p) => p.id === r.propertyId)?.name;

  return (
    <div className={`item ${c.priority === "urgent" ? "urgent" : ""}`}>
      <div className="row-between">
        <div className="row"><strong>Room {r.room}</strong><span>{r.guestName}</span>{r.vip && <span className="badge b-gold">VIP</span>}<span className="badge">{r.channel === "messaging_sim" ? "Messaging (simulated)" : titleCase(r.channel)}</span>{state.selectedPropertyId === "all" && <span className="xs muted">{prop}</span>}</div>
        <span className="xs muted">{ago(r.receivedAt, now)} · {r.id}</span>
      </div>
      <p style={{ margin: "0.5rem 0" }}>“{r.message}”</p>
      <div className="ai-box">
        <div className="row-between"><div className="h">AI recommendation</div><EngineBadge source={c.source} /></div>
        <div className="row">
          <strong>{DEPARTMENTS.find((d) => d.id === c.department)?.label}</strong><PriorityBadge p={c.priority} />
          <span className="muted">{c.ruleName} · SLA {c.slaMinutes}m</span><Confidence value={c.confidence} />
        </div>
        <div style={{ marginTop: "0.3rem" }}>{c.action}</div>
        {c.additional.length > 0 && <div className="muted" style={{ marginTop: "0.3rem" }}>Also mentions: {c.additional.map((a) => a.ruleName).join(", ")}.</div>}
        <div className="row" style={{ marginTop: "0.4rem" }}>{c.flags.map((f) => <span key={f} className={`badge ${f.includes("Safety") ? "b-danger" : "b-gold"}`}>{f}</span>)}</div>
        <div className="xs muted" style={{ marginTop: "0.3rem" }}>Why: {c.rationale}</div>
        {c.suggestEscalation && <div className="small" style={{ marginTop: "0.3rem", color: "var(--danger)" }}>Suggests manager escalation: {c.escalationReason} A manager decides after the task exists.</div>}
        <div className="draft"><span className="xs muted">Draft guest reply (not sent; sending is not operational):</span><br />{c.guestReplyDraft}</div>
      </div>
      {canTriage ? (
        <div style={{ marginTop: "0.6rem" }}>
          {editing && (
            <div className="grid g3" style={{ marginBottom: "0.6rem" }}>
              <div><label htmlFor={`d-${r.id}`}>Department</label><select id={`d-${r.id}`} value={dept} onChange={(e) => { const d = e.target.value as DepartmentId; setDept(d); setAssignee(suggestAssignee(state, r.propertyId, d) ?? ""); }}>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
              <div><label htmlFor={`p-${r.id}`}>Priority</label><select id={`p-${r.id}`} value={pri} onChange={(e) => setPri(e.target.value as Priority)}>{["low", "normal", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label htmlFor={`a-${r.id}`}>Assignee</label><select id={`a-${r.id}`} value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{pool.map((s) => <option key={s.id} value={s.id}>{s.name}{s.onShift ? "" : " (off shift)"}</option>)}</select></div>
            </div>
          )}
          <div className="row">
            <button className="btn btn-primary btn-sm" onClick={() => approveRequest(r.id, editing ? { department: dept, priority: pri, assigneeId: assignee || undefined } : {})}>{editing ? "Create task with my changes" : "Approve and create task"}</button>
            <button className="btn btn-sm" onClick={() => setEditing((e) => !e)}>{editing ? "Cancel changes" : "Change routing"}</button>
            <button className="btn btn-sm" onClick={() => dismissRequest(r.id)}>Dismiss</button>
          </div>
        </div>
      ) : <p className="xs muted" style={{ marginTop: "0.5rem" }}>Your role can view this request. Front desk or managers approve routing.</p>}
    </div>
  );
}

export default function Inbox() {
  const { state, addRequest } = useOps();
  const user = currentUser(state);
  const all = visibleRequests(state);
  const waiting = all.filter((r) => r.status === "new").sort((a, b) => a.receivedAt - b.receivedAt);
  const handled = all.filter((r) => r.status !== "new").sort((a, b) => b.receivedAt - a.receivedAt).slice(0, 6);
  const [busy, setBusy] = useState(false);

  async function simulate() {
    const s = SIM[Math.floor(Math.random() * SIM.length)];
    const pid = state.selectedPropertyId === "all" ? user.propertyIds[0] : state.selectedPropertyId;
    setBusy(true);
    try {
      const res = await fetch("/api/classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: s.msg, guestName: s.guest, rules: state.rules, settings: state.settings }) });
      const data = await res.json();
      if (res.ok) addRequest({ propertyId: pid, guestName: s.guest, room: s.room, vip: false, channel: "front_desk_logged", message: s.msg, classification: data.classification });
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head row-between">
        <div><h1>Guest request inbox</h1><p className="muted">The AI proposes; you approve. Nothing becomes a task until a person says so.</p></div>
        <div className="row"><SampleBadge />{can(user, "triage") && <button className="btn btn-sm" onClick={simulate} disabled={busy}>{busy ? "Classifying…" : "Log a sample request"}</button>}</div>
      </div>
      {waiting.length === 0 ? <div className="card"><strong>Inbox clear.</strong> <span className="muted">New requests from the guest form appear here.</span></div> : waiting.map((r) => <RequestCard key={r.id} r={r} />)}
      {handled.length > 0 && (
        <div className="card" style={{ marginTop: "1.2rem" }}>
          <h3>Recently handled</h3>
          {handled.map((r) => <div key={r.id} className="small" style={{ padding: "0.3rem 0" }}>Room {r.room} · {r.message.slice(0, 70)}{r.message.length > 70 ? "…" : ""} <span className={`badge ${r.status === "converted" ? "b-ok" : ""}`}>{r.status === "converted" ? `Task ${r.taskId}` : "Dismissed"}</span></div>)}
        </div>
      )}
    </>
  );
}
