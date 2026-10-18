"use client";

import { useState } from "react";
import { handoverToText } from "@/lib/handover";
import { currentUser, scopeIds } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import type { HandoverReport } from "@/lib/types";
import { EngineBadge, SampleBadge } from "@/components/ui";

export default function Handover() {
  const { state, saveHandover } = useOps();
  const user = currentUser(state);
  const ids = scopeIds(state);
  const [propId, setPropId] = useState(ids[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [current, setCurrent] = useState<HandoverReport | null>(null);
  const pid = ids.includes(propId) ? propId : ids[0];
  const property = state.properties.find((p) => p.id === pid)!;
  const report = current && current.propertyId === pid ? current : state.handovers.find((h) => h.propertyId === pid) ?? null;

  async function generate() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/handover", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property,
          tasks: state.tasks.filter((t) => t.propertyId === pid && user.departments.includes(t.department)),
          requests: state.requests.filter((r) => r.propertyId === pid),
          staff: state.staff, generatedBy: user.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate");
      setCurrent(data.report); saveHandover(data.report);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  async function copy() {
    if (!report) return;
    try { await navigator.clipboard.writeText(handoverToText(report, property.name)); setMsg("Copied to clipboard."); } catch { setMsg("Copy failed. Select the text manually."); }
  }

  return (
    <>
      <div className="page-head row-between"><div><h1>Shift handover</h1><p className="muted">A summary of what the incoming shift must know. Every line traces to a task or request.</p></div><SampleBadge /></div>
      <div className="card row" style={{ marginBottom: "1rem" }}>
        <label htmlFor="hp" className="sr-only">Property</label>
        <select id="hp" style={{ width: "auto" }} value={pid} onChange={(e) => setPropId(e.target.value)}>{ids.map((i) => <option key={i} value={i}>{state.properties.find((p) => p.id === i)?.name}</option>)}</select>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate handover now"}</button>
        {report && <button className="btn" onClick={copy}>Copy as text</button>}
        {err && <span className="err" role="alert">{err}</span>}{msg && <span className="small muted" role="status">{msg}</span>}
      </div>

      {report ? (
        <div className="card">
          <div className="row-between"><span className="eyebrow" style={{ margin: 0 }}>{report.shiftLabel} · {new Date(report.generatedAt).toLocaleString()}</span><EngineBadge source={report.source} /></div>
          <h2 style={{ fontSize: "1.4rem", marginTop: "0.5rem" }}>{report.headline}</h2>
          <p>{report.narrative}</p>
          <div className="grid g4" style={{ margin: "1rem 0" }}>
            {Object.entries({ Open: report.metrics.open, Urgent: report.metrics.urgent, "Past SLA": report.metrics.overdue, Escalated: report.metrics.escalated }).map(([k, v]) => <div className="card stat card-flat" key={k}><div className="v">{v}</div><div className="l">{k}</div></div>)}
          </div>
          {report.sections.map((s) => (
            <section key={s.title} style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.05rem" }}>{s.title}</h3>
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>{s.items.map((i, k) => <li key={k} className="small">{i}</li>)}</ul>
            </section>
          ))}
          <p className="xs muted">Prepared by {report.generatedBy}. Generated from sample data. Review before sharing; the summary describes records, it does not replace a verbal handover.</p>
        </div>
      ) : <div className="card muted">No handover yet. Generate one to see the summary.</div>}
    </>
  );
}
