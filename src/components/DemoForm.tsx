"use client";

import { useState } from "react";

type Errors = Record<string, string>;

export default function DemoForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "fail">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStatus("sending"); setErrors({});
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"), email: f.get("email"), company: f.get("company"),
          properties: Number(f.get("properties")), propertyType: f.get("propertyType"),
          message: f.get("message"), website: f.get("website"), consent: f.get("consent") === "on",
        }),
      });
      const data = await res.json();
      if (res.status === 400 && data.errors) { setErrors(data.errors); setStatus("idle"); return; }
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("fail");
    }
  }

  if (status === "done") {
    return (
      <div className="card" role="status">
        <h3>Thank you. Your details passed validation.</h3>
        <p>This is a prototype: the CRM (HubSpot) is not connected yet, so <strong>your request was not stored or forwarded</strong> and nobody will follow up from this form. To book a real conversation, contact the StayMosaic team directly once a sales contact address is published here.</p>
      </div>
    );
  }

  const Err = ({ k }: { k: string }) => (errors[k] ? <div className="err" id={`e-${k}`}>{errors[k]}</div> : null);
  return (
    <form className="card" onSubmit={submit} noValidate aria-describedby="demo-note">
      <h3>Book a demo</h3>
      <p id="demo-note" className="notice small">Prototype: this form is validated but not yet connected to HubSpot. Submissions are not stored or sent.</p>
      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" autoComplete="name" aria-describedby="e-name" /><Err k="name" /></div>
        <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" autoComplete="email" aria-describedby="e-email" /><Err k="email" /></div>
        <div className="field"><label htmlFor="company">Hotel or group name</label><input id="company" name="company" type="text" autoComplete="organization" /><Err k="company" /></div>
        <div className="field"><label htmlFor="properties">Number of properties</label><input id="properties" name="properties" type="number" min={1} defaultValue={1} /><Err k="properties" /></div>
      </div>
      <div className="field">
        <label htmlFor="propertyType">Property type</label>
        <select id="propertyType" name="propertyType" defaultValue="">
          <option value="" disabled>Choose…</option><option value="hotel">Hotel</option><option value="serviced_apartment">Serviced apartments</option><option value="both">Both</option>
        </select><Err k="propertyType" />
      </div>
      <div className="field"><label htmlFor="message">What would you like to improve? (optional)</label><textarea id="message" name="message" maxLength={1500} /><Err k="message" /></div>
      <div className="hp" aria-hidden="true"><label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="field"><label style={{ fontWeight: 400 }}><input type="checkbox" name="consent" /> I agree to be contacted about this demo.</label><Err k="consent" /></div>
      <button className="btn btn-primary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Request demo"}</button>
      {status === "fail" && <p className="err" role="alert">Something went wrong. Please try again.</p>}
    </form>
  );
}
