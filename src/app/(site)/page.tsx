import Link from "next/link";

const STEPS = [
  { n: "1", t: "A request arrives", d: "From your guest form or the front desk. Photos and PDFs attach securely once storage is connected." },
  { n: "2", t: "AI reads and recommends", d: "It classifies the request and proposes a department, priority, SLA and next action using your hotel’s rules." },
  { n: "3", t: "Your team decides", d: "Staff approve or change the routing. Escalation and guest replies are always a human choice." },
  { n: "4", t: "The shift stays in sync", d: "Tasks, queues and a concise handover summary keep every department working from the same picture." },
];

const AI = [
  { t: "Guest request understanding", d: "Turns free-text messages into structured, categorised requests, including messages that contain more than one issue." },
  { t: "Intelligent task routing", d: "Recommends department, priority and action from configurable rules, and shows exactly which rule it used." },
  { t: "Service operations assistant", d: "Answers authorised staff questions about open tasks, recurring issues and bottlenecks, with task references." },
  { t: "Guest feedback intelligence", d: "Groups reviews and requests into themes, so a leaking AC unit shows up as a pattern, not five separate complaints." },
  { t: "Shift handover summaries", d: "Generates a clear summary of unresolved tasks, priority issues and waiting guests at every shift change." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Hospitality operations, organised</div>
            <h1>Every guest request, routed with care.</h1>
            <div className="gold-rule" />
            <p className="lead">StayMosaic turns guest requests into organised, trackable tasks and helps hotel and serviced-apartment teams coordinate service across reception, housekeeping and maintenance. The AI recommends. Your staff stay in control.</p>
            <div className="row" style={{ marginTop: "1.5rem" }}>
              <Link className="btn btn-primary btn-lg" href="/demo">Try the routing demo</Link>
              <Link className="btn btn-lg" href="/dashboard">Explore the sample dashboard</Link>
            </div>
            <p className="xs muted" style={{ marginTop: "1rem" }}>Prototype with fictional sample data. No sign-up needed.</p>
          </div>

          <div className="card" aria-label="Illustration of a routed request (sample)">
            <div className="row-between"><span className="badge b-sample">Sample · Alder House Hotel</span><span className="xs muted">4 min ago</span></div>
            <p style={{ margin: "0.8rem 0", fontFamily: "var(--serif)", fontSize: "1.1rem" }}>“The air con in our room is leaking water onto the carpet and it’s very warm.”</p>
            <div className="ai-box">
              <div className="h">AI recommendation · rules engine</div>
              <div className="row"><strong>Maintenance</strong><span className="badge b-urgent">urgent</span><span className="muted">VIP bump · SLA 60 min</span></div>
              <div className="small muted" style={{ marginTop: "0.3rem" }}>Matched “ac”, “very warm” → Air conditioning fault. Also mentions water: check plumbing.</div>
            </div>
            <div className="row" style={{ marginTop: "0.8rem" }}>
              <span className="btn btn-primary btn-sm" aria-hidden="true">Approve and assign to Ben A.</span>
              <span className="btn btn-sm" aria-hidden="true">Change</span>
              <span className="btn btn-sm btn-danger" aria-hidden="true">Escalate</span>
            </div>
            <p className="xs muted" style={{ margin: "0.7rem 0 0" }}>The buttons are the point: a person makes each call.</p>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>From message to resolved, in four calm steps</h2>
          <div className="grid g4" style={{ marginTop: "1.5rem" }}>
            {STEPS.map((s) => (
              <div className="card card-flat" key={s.n}>
                <div className="badge b-gold" style={{ marginBottom: "0.6rem" }}>Step {s.n}</div>
                <h3>{s.t}</h3>
                <p className="small muted" style={{ margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Five AI capabilities</div>
          <h2>Intelligence where operations get busy</h2>
          <div className="grid g3" style={{ marginTop: "1.5rem" }}>
            {AI.map((a) => (
              <div className="card" key={a.t}><h3>{a.t}</h3><p className="small muted" style={{ margin: 0 }}>{a.d}</p></div>
            ))}
            <div className="card" style={{ background: "var(--green)", color: "#dbe5de" }}>
              <h3 style={{ color: "#fff" }}>Explore all features</h3>
              <p className="small">See the dashboard modules, controls and analytics.</p>
              <Link className="btn btn-gold btn-sm" href="/features">Features</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section dark">
        <div className="wrap grid g2" style={{ alignItems: "center", gap: "3rem" }}>
          <div>
            <div className="eyebrow">Staff stay in control</div>
            <h2>AI that works inside your rules</h2>
            <p>Hotels differ. You decide what counts as urgent, which department owns what, and when a manager should be told. The AI can only pick from the rules you enable, and safety-related requests always raise the alarm.</p>
          </div>
          <ul className="check" style={{ color: "#e9efe9" }}>
            <li>Configurable rules for department, priority, SLA and action</li>
            <li>Escalation and guest replies are always a human decision</li>
            <li>Low-confidence requests go to people, not auto-routing</li>
            <li>Role-based views by property and department</li>
            <li>Audit log of every approval, change and escalation</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ textAlign: "center", maxWidth: 720 }}>
          <h2>See a request become a task</h2>
          <p className="muted">Type a guest message, adjust a hotel rule, and watch the routing follow. Then open the sample dashboard and generate a shift handover.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary btn-lg" href="/demo">Interactive demo</Link>
            <Link className="btn btn-lg" href="/pricing">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
