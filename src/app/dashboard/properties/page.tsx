"use client";

import { currentUser, visibleProperties } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { SampleBadge } from "@/components/ui";

export default function Properties() {
  const { state, now, setProperty } = useOps();
  const user = currentUser(state);
  return (
    <>
      <div className="page-head row-between"><div><h1>Properties</h1><p className="muted">Hotels and serviced apartments in one group. You see only the properties your role allows.</p></div><SampleBadge /></div>
      <div className="grid g3">
        {visibleProperties(state).map((p) => {
          const tasks = state.tasks.filter((t) => t.propertyId === p.id && t.status !== "done" && user.departments.includes(t.department));
          const overdue = tasks.filter((t) => t.dueAt < now).length;
          const reqs = state.requests.filter((r) => r.propertyId === p.id && r.status === "new").length;
          return (
            <div className="card" key={p.id}>
              <span className="badge b-gold">{p.type === "hotel" ? "Hotel" : "Serviced apartments"}</span>
              <h3 style={{ marginTop: "0.5rem" }}>{p.name}</h3>
              <p className="small muted">{p.city} · {p.units} {p.type === "hotel" ? "rooms" : "apartments"}</p>
              <div className="row small"><span><strong>{tasks.length}</strong> open</span><span style={overdue ? { color: "var(--danger)" } : undefined}><strong>{overdue}</strong> past SLA</span><span><strong>{reqs}</strong> to triage</span></div>
              <button className="btn btn-sm" style={{ marginTop: "0.8rem" }} onClick={() => setProperty(p.id)}>{state.selectedPropertyId === p.id ? "Selected" : "Switch to this property"}</button>
            </div>
          );
        })}
      </div>
      {visibleProperties(state).length === 1 && <p className="small muted" style={{ marginTop: "1rem" }}>Your role is limited to one property. Switch to “Amara Okafor” to see the group view.</p>}
    </>
  );
}
