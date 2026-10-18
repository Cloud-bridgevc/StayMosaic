"use client";

import { useState } from "react";
import { DEFAULT_RULES, DEFAULT_SETTINGS } from "@/lib/rules";
import { INCOMING_KEY, STATE_KEY } from "@/lib/store";
import { PROPERTIES } from "@/lib/sample-data";
import type { GuestRequest, OpsState } from "@/lib/types";

/** Reads the hotel's current (possibly edited) rules from the demo state so the guest form and dashboard agree. */
function currentRules() {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null") as OpsState | null;
    if (s?.rules && s?.settings) return { rules: s.rules, settings: s.settings };
  } catch { /* fall through to defaults */ }
  return { rules: DEFAULT_RULES, settings: DEFAULT_SETTINGS };
}

export default function GuestRequestForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const guestName = String(f.get("name") ?? "").trim();
    const room = String(f.get("room") ?? "").trim();
    const message = String(f.get("message") ?? "").trim();
    const propertyId = String(f.get("property"));
    if (!guestName || !room || message.length < 3) { setError("Please enter your name, room and a short message."); return; }
    setError(""); setStatus("sending");
    try {
      const { rules, settings } = currentRules();
      const res = await fetch("/api/classify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, guestName, vip: false, rules, settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      const req: GuestRequest = {
        id: `REQ-G${Date.now().toString(36)}`, propertyId, guestName, room, vip: false, channel: "web_form",
        message, receivedAt: Date.now(), status: "new", classification: data.classification,
      };
      const queue = JSON.parse(localStorage.getItem(INCOMING_KEY) ?? "[]") as GuestRequest[];
      localStorage.setItem(INCOMING_KEY, JSON.stringify([req, ...queue]));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="card" role="status">
        <h3>Request received</h3>
        <p>Thank you. Our team has your message and will be in touch shortly.</p>
        <p className="notice small">Prototype: this request was saved in your browser only. Open the <a href="/dashboard/inbox">dashboard inbox</a> to see it arrive for staff triage. The AI has only recommended a routing; a staff member must approve it.</p>
        <button className="btn" onClick={() => setStatus("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="property">Where are you staying?</label>
        <select id="property" name="property" defaultValue="p-alder">{PROPERTIES.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}</select></div>
      <div className="grid g2">
        <div className="field"><label htmlFor="g-name">Your name</label><input id="g-name" name="name" type="text" autoComplete="name" /></div>
        <div className="field"><label htmlFor="g-room">Room or apartment</label><input id="g-room" name="room" type="text" /></div>
      </div>
      <div className="field"><label htmlFor="g-msg">How can we help?</label><textarea id="g-msg" name="message" maxLength={2000} placeholder="e.g. The shower has no hot water" /></div>
      <div className="field">
        <label htmlFor="g-file">Photo or PDF (optional)</label>
        <input id="g-file" type="file" disabled aria-describedby="g-file-note" />
        <div id="g-file-note" className="xs muted">Attachments are unavailable in this prototype: Amazon S3 storage is not connected.</div>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send request"}</button>
      <p className="xs muted" style={{ marginTop: "0.8rem" }}>For emergencies, call the front desk or local emergency services. Do not rely on this form.</p>
    </form>
  );
}
