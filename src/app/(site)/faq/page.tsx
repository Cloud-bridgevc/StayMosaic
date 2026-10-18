import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <div className="eyebrow">FAQ</div>
        <h1>Questions, answered plainly</h1>
        <div style={{ marginTop: "1.5rem" }}>
          {FAQ.map((f) => (
            <details className="faq" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
        <p style={{ marginTop: "2rem" }}>Still curious? <Link href="/demo#book">Book a demo</Link>.</p>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </div>
    </section>
  );
}
