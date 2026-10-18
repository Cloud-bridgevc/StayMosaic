"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { currentUser, visibleProperties, visibleRequests, visibleTasks } from "@/lib/permissions";
import { OpsProvider, useOps } from "@/lib/store";
import { SAMPLE_DATA_LABEL } from "@/lib/sample-data";
import { Brand } from "./Brand";

const NAV: { href: string; label: string; group: string }[] = [
  { href: "/dashboard", label: "Live overview", group: "Operations" },
  { href: "/dashboard/inbox", label: "Request inbox", group: "Operations" },
  { href: "/dashboard/housekeeping", label: "Housekeeping board", group: "Operations" },
  { href: "/dashboard/maintenance", label: "Maintenance queue", group: "Operations" },
  { href: "/dashboard/departments", label: "Department assignment", group: "Operations" },
  { href: "/dashboard/escalations", label: "Priority and escalation", group: "Control" },
  { href: "/dashboard/handover", label: "Shift handover", group: "Control" },
  { href: "/dashboard/assistant", label: "Operations assistant", group: "Insight" },
  { href: "/dashboard/analytics", label: "Recurring issues", group: "Insight" },
  { href: "/dashboard/properties", label: "Properties", group: "Group" },
  { href: "/dashboard/integrations", label: "Integrations status", group: "Group" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { state, setUser, setProperty, resetDemo } = useOps();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const user = currentUser(state);
  const props = visibleProperties(state);
  const newReqs = visibleRequests(state).filter((r) => r.status === "new").length;
  const urgent = visibleTasks(state).filter((t) => t.status !== "done" && t.priority === "urgent").length;
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Dashboard navigation">
        <Brand href="/" />
        {groups.map((g) => (
          <div key={g}>
            <div className="side-label">{g}</div>
            {NAV.filter((n) => n.group === g).map((n) => {
              const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
              const count = n.href.endsWith("inbox") ? newReqs : n.href.endsWith("escalations") ? urgent : 0;
              return (
                <Link key={n.href} href={n.href} className={`side-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                  {n.label}{count > 0 && <span className="side-count">{count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: "auto", paddingTop: "1rem" }} className="xs">
          <button className="btn btn-sm" onClick={() => { if (confirm("Reset all sample data to its starting state?")) resetDemo(); }}>Reset sample data</button>
        </div>
      </aside>
      <div className="main">
        <div className="sample-banner">{SAMPLE_DATA_LABEL} Not connected to AWS, PostgreSQL or HubSpot.</div>
        <div className="topbar">
          <button className="btn btn-sm menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle navigation">Menu</button>
          <label className="sr-only" htmlFor="prop">Property</label>
          <select id="prop" value={state.selectedPropertyId} onChange={(e) => setProperty(e.target.value)}>
            {props.length > 1 && <option value="all">All my properties</option>}
            {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="grow" />
          <label className="xs muted" htmlFor="who">Viewing as (demo role switch, not login)</label>
          <select id="who" value={user.id} onChange={(e) => setUser(e.target.value)}>
            {state.users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
          </select>
        </div>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return <OpsProvider><Shell>{children}</Shell></OpsProvider>;
}
