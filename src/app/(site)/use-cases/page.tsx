import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Use cases" };

const HOTEL = [
  ["Guest asks for a cooler room", "Routed to Maintenance as high priority. If the guest is a VIP the priority rises. Housekeeping is flagged if the room can’t be used."],
  ["Noise at night", "Routed to Reception with a short SLA. The third report from the same room in a week appears under recurring issues."],
  ["Gas smell in a corridor", "Matches a safety rule: urgent, duty manager alerted, emergency SOP shown. The AI cannot downgrade it."],
  ["Breakfast complaint", "Routed to the duty manager with an escalation suggestion. The manager decides whether to escalate or call the guest."],
];
const APT = [
  ["Dishwasher leaking in a long-stay apartment", "Maintenance fault with an urgency rule for water damage. A second report in the same apartment shows up as a recurring issue."],
  ["Mid-stay linen change", "Scheduled housekeeping tasks sit alongside guest requests on the same board."],
  ["Utilities billing question", "Routed to Reception with a billing rule. Refunds and adjustments need manager approval."],
  ["Departure clean and inspection", "Turnover tasks hand off between housekeeping and maintenance, with blocked-reason tracking."],
];

function Cases({ items }: { items: string[][] }) {
  return (
    <div className="grid g2" style={{ marginTop: "1.2rem" }}>
      {items.map(([t, d]) => (
        <div className="card" key={t}><h3>{t}</h3><p className="small muted" style={{ margin: 0 }}>{d}</p></div>
      ))}
    </div>
  );
}

export default function UseCases() {
  return (
    <>
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Use cases</div>
          <h1>Hotels and serviced apartments, one operations picture</h1>
          <p className="lead muted" style={{ maxWidth: 720 }}>Different guests, same need: requests must reach the right team fast, and nothing should fall through the cracks at shift change.</p>
          <h2 style={{ marginTop: "2.5rem" }}>Hotels</h2>
          <p className="muted">Reception, housekeeping and maintenance coordinating around short stays and high turnover.</p>
          <Cases items={HOTEL} />
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <h2>Serviced apartments</h2>
          <p className="muted">Longer stays mean appliances, utilities, mid-stay services and recurring issues matter more.</p>
          <Cases items={APT} />
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <h2>Mixed groups</h2>
          <p className="muted" style={{ maxWidth: 700 }}>Run hotels and apartment buildings in one workspace. Each property has its own rules, roster and queues, and group managers get cross-property analytics to spot problems that repeat between sites.</p>
          <div className="row"><Link className="btn btn-primary" href="/demo">Try the demo</Link><Link className="btn" href="/dashboard">Open sample dashboard</Link></div>
        </div>
      </section>
    </>
  );
}
