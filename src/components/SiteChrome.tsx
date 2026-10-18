import Link from "next/link";
import { Brand } from "./Brand";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="inner">
        <Brand />
        <nav className="nav" aria-label="Main">
          <Link className="hide-sm" href="/features">Features</Link>
          <Link className="hide-sm" href="/use-cases">Use cases</Link>
          <Link className="hide-sm" href="/pricing">Pricing</Link>
          <Link className="hide-sm" href="/faq">FAQ</Link>
          <Link href="/demo">Try the demo</Link>
          <Link className="btn btn-primary btn-sm" href="/dashboard">Open sample dashboard</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="grid g3">
          <div>
            <Brand />
            <p style={{ marginTop: "0.8rem" }}>AI-native operations for hotels and serviced apartments. AI recommends. Your team decides.</p>
          </div>
          <div>
            <strong>Product</strong>
            <p className="small" style={{ lineHeight: 2 }}>
              <Link href="/features">Features</Link><br />
              <Link href="/use-cases">Hotels and serviced apartments</Link><br />
              <Link href="/pricing">Pricing</Link><br />
              <Link href="/faq">FAQ</Link>
            </p>
          </div>
          <div>
            <strong>Try it</strong>
            <p className="small" style={{ lineHeight: 2 }}>
              <Link href="/demo">Request-routing demo</Link><br />
              <Link href="/request">Guest request form (sample hotel)</Link><br />
              <Link href="/dashboard">Sample dashboard</Link>
            </p>
          </div>
        </div>
        <p className="small" style={{ marginTop: "2rem", borderTop: "1px solid #444", paddingTop: "1rem" }}>
          Prototype build. All hotels, guests, staff and reviews shown are fictional sample data. Integrations marked “not connected” or “planned” are not live. See the in-app Integrations page for the exact status.
        </p>
      </div>
    </footer>
  );
}
