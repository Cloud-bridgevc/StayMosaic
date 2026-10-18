"use client";

import { useState } from "react";
import { SUGGESTED_QUESTIONS, type AssistantAnswer } from "@/lib/assistant";
import { currentUser } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { EngineBadge, SampleBadge } from "@/components/ui";

interface Turn { q: string; a?: AssistantAnswer & { source: "rules" | "bedrock" }; error?: string }

export default function Assistant() {
  const { state } = useOps();
  const user = currentUser(state);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    setBusy(true); setQ("");
    const idx = turns.length;
    setTurns((t) => [...t, { q: text }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, user, properties: state.properties, tasks: state.tasks, requests: state.requests, reviews: state.reviews, staff: state.staff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, a: data } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, error: e instanceof Error ? e.message : "Failed" } : x)));
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head row-between"><div><h1>Operations assistant</h1><p className="muted">Ask about tasks, recurring issues and bottlenecks. Read-only, scoped to what {user.name.split(" ")[0]}’s role can see.</p></div><SampleBadge /></div>
      <div className="row" style={{ marginBottom: "1rem" }}>{SUGGESTED_QUESTIONS.map((s) => <button key={s} className="chip-btn" onClick={() => ask(s)} disabled={busy}>{s}</button>)}</div>
      <div className="stack" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="stack">
            <div className="msg user">{t.q}</div>
            {t.a && (
              <div className="msg bot">
                <div className="row-between"><strong>{t.a.answer}</strong><EngineBadge source={t.a.source} /></div>
                {t.a.lines.length > 0 && <ul className="small" style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>{t.a.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>}
                {t.a.sources.length > 0 && <div className="xs muted" style={{ marginTop: "0.4rem" }}>Sources: {t.a.sources.slice(0, 10).join(", ")}</div>}
              </div>
            )}
            {t.error && <div className="msg bot err">{t.error}</div>}
          </div>
        ))}
      </div>
      <form className="row" style={{ marginTop: "1rem" }} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <label className="sr-only" htmlFor="q">Question</label>
        <input id="q" type="text" className="grow" value={q} maxLength={400} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is blocked in maintenance?" />
        <button className="btn btn-primary" disabled={busy}>Ask</button>
      </form>
      <p className="xs muted" style={{ marginTop: "0.6rem" }}>Try switching “Viewing as” to Tomas (housekeeping) and asking about maintenance: the assistant will decline. It can’t escalate, assign or message anyone.</p>
    </>
  );
}
