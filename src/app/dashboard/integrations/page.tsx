"use client";

import { INTEGRATIONS, STATUS_LABEL, type IntegrationStatus } from "@/lib/integrations";

const CLS: Record<IntegrationStatus, string> = { demo: "b-ok", ready_unconnected: "b-warn", planned: "b-gold", not_operational: "b-danger" };

export default function Integrations() {
  return (
    <>
      <div className="page-head"><h1>Integrations status</h1><p className="muted">What is real in this build, and what is not.</p></div>
      <div className="grid g2">
        {INTEGRATIONS.map((i) => (
          <div className="card" key={i.id}>
            <div className="row-between"><h3 style={{ margin: 0 }}>{i.name}</h3><span className={`badge ${CLS[i.status]}`}>{STATUS_LABEL[i.status]}</span></div>
            <p className="small muted" style={{ margin: "0.3rem 0" }}>{i.purpose}</p>
            <p className="small" style={{ margin: 0 }}>{i.detail}</p>
          </div>
        ))}
      </div>
    </>
  );
}
