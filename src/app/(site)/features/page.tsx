import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Features" };

const AI = [
  { t: "Guest request understanding", d: "Classifies requests from a web form or front-desk entry into structured categories. Handles multi-issue messages by flagging each issue so staff can split them. Authorised messaging channels are planned.", s: "Working in demo (rules engine). Bedrock ready, not connected." },
  { t: "Intelligent task routing", d: "Recommends department, priority, SLA and next action from your configurable rules. Every recommendation shows its matched terms, rule and confidence. VIP bumps and safety floors are explicit settings.", s: "Working in demo." },
  { t: "Service operations assistant", d: "Answers authorised staff questions such as “what is overdue?” or “what happened in room 412?”. Answers cite task IDs, respect property and department access, and the assistant never takes actions.", s: "Working in demo (read-only, rule-based)." },
  { t: "Guest feedback intelligence", d: "Groups reviews and survey comments into themes, then links them to the service requests behind them, separating recurring issues from one-offs.", s: "Working in demo (keyword themes)." },
  { t: "Shift handover summaries", d: "Compiles unresolved tasks, priority issues, escalations, blocked work and waiting guests into one summary at every shift change. Each line traces to a task record.", s: "Working in demo." },
];

const MODULES = [
  ["Live operations overview", "Open work, SLA risk, waiting requests and department load at a glance."],
  ["Guest request inbox", "AI-triaged requests awaiting approval, with reply drafts for staff review."],
  ["Housekeeping task board", "Turnovers, re-cleans and linen requests on a four-column board."],
  ["Maintenance queue", "Faults ranked by priority and SLA, with blocked work and parts waits visible."],
  ["Department assignment", "On-shift staff, workload and assignment recommendations."],
  ["Priority and escalation controls", "Suggested escalations wait for a manager’s decision. Rules are editable and audited."],
  ["Shift handover reports", "Generate, review and copy a handover for any shift."],
  ["Recurring issue analytics", "Repeat rooms, floor-level faults, bottlenecks and feedback themes."],
  ["Multi-property management", "Hotels and serviced apartments in one group, with role-scoped access."],
];

export default function Features() {
  return (
    <>
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Features</div>
          <h1>Built for the way service teams actually work</h1>
          <p className="lead muted" style={{ maxWidth: 700 }}>Five AI capabilities, nine dashboard modules, and one rule: the AI recommends, people decide.</p>
          <div className="stack" style={{ marginTop: "2rem" }}>
            {AI.map((f, i) => (
              <div className="card" key={f.t}>
                <div className="row-between">
                  <h3 style={{ margin: 0 }}>{i + 1}. {f.t}</h3>
                  <span className="badge b-gold">{f.s}</span>
                </div>
                <p style={{ margin: "0.6rem 0 0" }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <h2>The dashboard</h2>
          <div className="grid g3" style={{ marginTop: "1.5rem" }}>
            {MODULES.map(([t, d]) => (
              <div className="card card-flat" key={t}><h3>{t}</h3><p className="small muted" style={{ margin: 0 }}>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid g2">
          <div className="card">
            <h3>Control and safety by design</h3>
            <ul className="check">
              <li>Human approval before any task exists</li>
              <li>Escalation is always a staff action</li>
              <li>AI limited to your enabled rules</li>
              <li>Safety terms force an urgent, manager-alerting rule</li>
              <li>Guest replies are drafts only</li>
              <li>Audit log for approvals, changes and escalations</li>
            </ul>
          </div>
          <div className="card">
            <h3>Runs on AWS</h3>
            <ul className="check">
              <li>Amazon Bedrock for classification and summaries</li>
              <li>PostgreSQL for tasks, rules and property data</li>
              <li>Amazon S3 for supported attachments</li>
              <li>AWS Lambda for background workflows</li>
            </ul>
            <p className="small muted">Prototype status: architecture and code scaffolding exist; the services are not yet connected. See the in-app Integrations page for exact status.</p>
          </div>
        </div>
        <div className="wrap" style={{ marginTop: "2rem" }}>
          <Link className="btn btn-primary" href="/demo">Try the routing demo</Link>
        </div>
      </section>
    </>
  );
}
