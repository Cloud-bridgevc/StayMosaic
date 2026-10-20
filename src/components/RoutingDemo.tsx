"use client";

import { useState } from "react";
import { DEFAULT_RULES, DEFAULT_SETTINGS } from "@/lib/rules";
import { DEPARTMENTS, type Classification, type Priority } from "@/lib/types";
import { Confidence, EngineBadge, PriorityBadge } from "./ui";

const SAMPLES = [
  { label: "AC leaking (VIP)", vip: true, msg: "Hi, the air con in our room is leaking water onto the carpet and it's very warm. Could someone come soon?" },
  { label: "Extra towels", vip: false, msg: "Could we have two extra towels and a baby cot please?" },
  { label: "Loud neighbours", vip: false, msg: "The music from the room next door is really loud, we can't sleep." },
  { label: "Gas smell", vip: false, msg: "There's a strong smell of gas in the corridor near the stairwell." },
  { label: "Billing + stain", vip: false, msg: "I was charged twice for the minibar, and there's also a stain on the bed sheets." },
  { label: "Unclear", vip: false, msg: "Hello! What time does the spa open?" },
];

// Illustrative roster for the demo. Real assignment uses the property's live roster.
const DEMO_ASSIGNEE: Record<string, string> = { reception: "Priya Nair", housekeeping: "Aisha Karim", maintenance: "Ben Achterberg" };

type Decision = null | "approved" | "escalated";

export default function RoutingDemo() {
  const [message, setMessage] = useState(SAMPLES[0].msg);
  const [vip, setVip] = useState(true);
  const [noisePriority, setNoisePriority] = useState<Priority>("high");
  const [result, setResult] = useState<Classification | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<Decision>(null);
  const [editing, setEditing] = useState(false);
  const [ovDept, setOvDept] = useState<string>("");
  const [ovPri, setOvPri] = useState<Priority | "">("");

  async function run() {
    setLoading(true); setError(""); setDecision(null); setEditing(false); setOvDept(""); setOvPri("");
    try {
      const rules = DEFAULT_RULES.map((r) => (r.id === "r-noise" ? { ...r, priority: noisePriority } : r));
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, vip, guestName: "Alex Guest", rules, settings: DEFAULT_SETTINGS }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data.classification);
      setEngine(data.engine.bedrockConfigured ? "Amazon Bedrock" : "Rules engine (Bedrock not connected in this build)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const c = result;
  const finalDept = c ? (ovDept || c.department) : "";
  const finalPri = c ? ((ovPri || c.priority) as Priority) : "normal";
  const changed = !!c && (finalDept !== c.department || finalPri !== c.priority);
  const deptLabel = c ? DEPARTMENTS.find((d) => d.id === finalDept)?.label : "";

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="card stack">
        <h3>1 · A guest sends a request</h3>
        <div className="row" role="group" aria-label="Sample messages">
          {SAMPLES.map((s) => (
            <button key={s.label} className="chip-btn" aria-pressed={message === s.msg} onClick={() => { setMessage(s.msg); setVip(s.vip); setResult(null); setDecision(null); }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="demo-msg">Guest message (try your own)</label>
          <textarea id="demo-msg" value={message} maxLength={2000} onChange={(e) => { setMessage(e.target.value); setResult(null); setDecision(null); }} />
        </div>
        <div className="grid g2">
          <div>
            <label htmlFor="vip"><input id="vip" type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} /> VIP guest (priority bump rule)</label>
          </div>
          <div>
            <label htmlFor="noise">Hotel rule: noise priority</label>
            <select id="noise" value={noisePriority} onChange={(e) => setNoisePriority(e.target.value as Priority)}>
              <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={run} disabled={loading || message.trim().length < 3}>
          {loading ? "Analysing…" : "Classify and route"}
        </button>
        {error && <p className="err" role="alert">{error}</p>}
        <p className="xs muted">The hotel’s rules decide the department, priority and SLA. Change the noise rule above and run it again to see the routing follow.</p>
      </div>

      <div className="pipe" aria-live="polite">
        <div className={`pipe-step ${c ? "" : "pending"}`}>
          <div className="row-between"><strong><span className="n">2</span>AI understands the request</strong>{c && <EngineBadge source={c.source} />}</div>
          {c ? (
            <div className="small" style={{ marginTop: "0.5rem" }}>
              <div>Category: <strong>{c.ruleName}</strong> <Confidence value={c.confidence} /></div>
              {c.matchedTerms.length > 0 && <div className="muted">Matched: {c.matchedTerms.join(", ")}</div>}
              {c.additional.length > 0 && <div className="muted">Also mentions: {c.additional.map((a) => a.ruleName).join(", ")}. Consider splitting into two tasks.</div>}
              {c.flags.length > 0 && <div className="row" style={{ marginTop: "0.3rem" }}>{c.flags.map((f) => <span key={f} className="badge b-gold">{f}</span>)}</div>}
              <div className="xs muted" style={{ marginTop: "0.3rem" }}>Engine: {engine}</div>
            </div>
          ) : <p className="small muted" style={{ margin: "0.4rem 0 0" }}>Waiting for a request.</p>}
        </div>

        <div className={`pipe-step ${c ? "" : "pending"}`}>
          <strong><span className="n">3</span>Recommendation from hotel rules</strong>
          {c ? (
            <div className="small" style={{ marginTop: "0.5rem" }}>
              <div className="row"><span>Department: <strong>{deptLabel}</strong></span><PriorityBadge p={c.priority} /><span className="muted">SLA {c.slaMinutes} min</span></div>
              <div style={{ marginTop: "0.3rem" }}>{c.action}</div>
              {c.needsHumanTriage && <div className="notice" style={{ marginTop: "0.5rem" }}>Low confidence. This goes to a human for triage, not auto-routing.</div>}
              <div className="draft"><span className="xs muted">Draft guest reply (staff must review; not sent):</span><br />{c.guestReplyDraft}</div>
            </div>
          ) : <p className="small muted" style={{ margin: "0.4rem 0 0" }}>No recommendation yet.</p>}
        </div>

        <div className={`pipe-step human ${c ? "" : "pending"}`}>
          <strong><span className="n">4</span>Staff decide</strong>
          {c ? (
            <div style={{ marginTop: "0.5rem" }}>
              {decision === null && (
                <>
                {editing && (
                  <div className="grid g2" style={{ marginBottom: "0.6rem" }}>
                    <div><label htmlFor="ov-dept">Department</label>
                      <select id="ov-dept" value={finalDept} onChange={(e) => setOvDept(e.target.value)}>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
                    <div><label htmlFor="ov-pri">Priority</label>
                      <select id="ov-pri" value={finalPri} onChange={(e) => setOvPri(e.target.value as Priority)}>{["low", "normal", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}</select></div>
                  </div>
                )}
                <div className="row">
                  <button className="btn btn-sm btn-primary" onClick={() => setDecision("approved")}>{editing && changed ? "Create task with my changes" : "Approve and create task"}</button>
                  <button className="btn btn-sm" onClick={() => { setEditing((v) => !v); if (editing) { setOvDept(""); setOvPri(""); } }}>{editing ? "Cancel changes" : "Change routing…"}</button>
                  {c.suggestEscalation && <button className="btn btn-sm btn-danger" onClick={() => setDecision("escalated")}>Escalate to duty manager</button>}
                </div>
                </>
              )}
              {c.suggestEscalation && decision === null && <p className="xs muted" style={{ margin: "0.5rem 0 0" }}>AI suggests escalation: {c.escalationReason} Only a person can escalate.</p>}
              {decision && (
                <div className="ai-box" style={{ background: "#fffdf8" }}>
                  <div className="h">{decision === "escalated" ? "Escalated by staff (simulated)" : "Task created (simulated)"}</div>
                  <div><strong>{c.ruleName}</strong> · {deptLabel} · <PriorityBadge p={finalPri} />{changed && <span className="badge b-gold" style={{ marginLeft: "0.4rem" }}>Changed by staff</span>}</div>
                  <div className="small muted">Assigned to {DEMO_ASSIGNEE[finalDept]} (sample roster) · due in {c.slaMinutes} min · approved by Duty Manager (sample)</div>
                  <button className="btn btn-sm" style={{ marginTop: "0.5rem" }} onClick={() => setDecision(null)}>Undo</button>
                </div>
              )}
            </div>
          ) : <p className="small muted" style={{ margin: "0.4rem 0 0" }}>The AI never creates tasks, escalates, or messages guests on its own.</p>}
        </div>
      </div>
    </div>
  );
}
