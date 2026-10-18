import type { Metadata } from "next";
import GuestRequestForm from "@/components/GuestRequestForm";

export const metadata: Metadata = { title: "Guest request form (sample)" };

export default function RequestPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="eyebrow">Sample guest form</div>
        <h1 style={{ fontSize: "2.2rem" }}>Request assistance</h1>
        <p className="notice">This is the guest-facing form of the fictional hotels. Use it in the demo story: send a request here, then open the staff dashboard to triage it.</p>
        <div style={{ marginTop: "1.2rem" }}><GuestRequestForm /></div>
      </div>
    </section>
  );
}
