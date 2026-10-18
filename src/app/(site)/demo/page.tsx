import type { Metadata } from "next";
import Link from "next/link";
import DemoForm from "@/components/DemoForm";
import RoutingDemo from "@/components/RoutingDemo";

export const metadata: Metadata = { title: "Interactive demo" };

export default function Demo() {
  return (
    <>
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Interactive demo</div>
          <h1>Watch a guest request become a task</h1>
          <p className="lead muted" style={{ maxWidth: 720 }}>Pick a sample message or write your own, adjust a hotel rule, and see what the AI recommends. Then play the staff member and decide. Fictional hotel; nothing is saved.</p>
          <div style={{ marginTop: "1.5rem" }}><RoutingDemo /></div>
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div className="row-between">
              <div><h3 style={{ margin: 0 }}>Want to see the whole story?</h3><p className="small muted" style={{ margin: 0 }}>Submit a request as a guest, then open the dashboard as the duty manager and approve it.</p></div>
              <div className="row"><Link className="btn" href="/request">Open guest form</Link><Link className="btn btn-primary" href="/dashboard">Open dashboard</Link></div>
            </div>
          </div>
        </div>
      </section>
      <section className="section alt" id="book">
        <div className="wrap grid g2" style={{ alignItems: "start", gap: "3rem" }}>
          <div>
            <div className="eyebrow">Talk to us</div>
            <h2>Book a demo for your group</h2>
            <p className="muted">Tell us about your properties and we’ll walk through your own request types, rules and handover process.</p>
            <ul className="check">
              <li>Map your departments and escalation rules</li>
              <li>See your own request types routed live</li>
              <li>Plan onboarding and integrations</li>
            </ul>
          </div>
          <DemoForm />
        </div>
      </section>
    </>
  );
}
