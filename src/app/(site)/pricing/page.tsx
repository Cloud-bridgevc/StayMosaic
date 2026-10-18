import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Pricing" };

const TIERS = [
  { name: "Boutique", price: "£149", unit: "per property / month", for: "Single hotel or apartment building up to 60 units", feats: ["Request inbox and AI routing", "Housekeeping and maintenance boards", "Shift handover summaries", "Rules editor", "Email support"], cta: "Book a demo" },
  { name: "Group", price: "£119", unit: "per property / month, 3+ properties", for: "Multi-property operators", feats: ["Everything in Boutique", "Multi-property dashboard and role scoping", "Recurring-issue and feedback analytics", "Service operations assistant", "HubSpot-ready onboarding support"], cta: "Book a demo", featured: true },
  { name: "Enterprise", price: "Custom", unit: "", for: "Large groups with security or integration needs", feats: ["Everything in Group", "PMS and SSO integrations (scoped per project)", "Dedicated AWS environment options", "Custom rule libraries and onboarding", "Priority support"], cta: "Talk to us" },
];

export default function Pricing() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="eyebrow">Pricing</div>
        <h1>Simple pricing per property</h1>
        <div className="notice" style={{ margin: "1rem 0 2rem" }}>
          <strong>Placeholder pricing.</strong> These figures illustrate the planned structure for the prototype and are not a binding offer. Features marked as planned elsewhere on this site (PMS, SSO, messaging) are not yet available.
        </div>
        <div className="grid g3">
          {TIERS.map((t) => (
            <div key={t.name} className="card" style={t.featured ? { borderColor: "var(--gold)", boxShadow: "0 0 0 1px var(--gold), var(--shadow)" } : undefined}>
              {t.featured && <span className="badge b-gold">Most popular</span>}
              <h3 style={{ marginTop: "0.5rem" }}>{t.name}</h3>
              <div className="price">{t.price}</div>
              <div className="small muted">{t.unit || " "}</div>
              <p className="small" style={{ marginTop: "0.8rem" }}>{t.for}</p>
              <ul className="check small">{t.feats.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link className={`btn ${t.featured ? "btn-primary" : ""}`} href="/demo#book">{t.cta}</Link>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: "1.5rem" }}>AI usage (Amazon Bedrock) is expected to be included within fair-use limits. Final inclusions, currency and terms will be confirmed before launch.</p>
      </div>
    </section>
  );
}
