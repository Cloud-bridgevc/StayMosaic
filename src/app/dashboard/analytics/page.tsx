"use client";

import { titleCase } from "@/lib/format";
import { categoryCounts, feedbackThemes, recurringIssues, sentimentOf, themesOf } from "@/lib/insights";
import { scopeIds, visibleRequests, visibleTasks } from "@/lib/permissions";
import { useOps } from "@/lib/store";
import { SampleBadge } from "@/components/ui";

export default function Analytics() {
  const { state, now } = useOps();
  const tasks = visibleTasks(state);
  const ids = scopeIds(state);
  const reviews = state.reviews.filter((r) => ids.includes(r.propertyId));
  const rec = recurringIssues(tasks, now);
  const cats = categoryCounts(tasks, now);
  const themes = feedbackThemes(reviews, tasks, visibleRequests(state), now);
  const max = Math.max(1, ...cats.map((c) => c.count));
  const pname = (id: string) => state.properties.find((p) => p.id === id)?.name;

  return (
    <>
      <div className="page-head row-between"><div><h1>Recurring issues and feedback</h1><p className="muted">Last 14 days of requests and tasks, plus reviews. Themes are keyword-based in this build.</p></div><SampleBadge /></div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Recurring issues ({rec.length})</h3>
          {rec.length === 0 && <p className="muted small">No repeats found.</p>}
          {rec.map((r) => (
            <div className="item" key={r.key}>
              <div className="row-between"><strong>{r.label} · {titleCase(r.category)}</strong><span className="badge b-danger">{r.count} reports</span></div>
              <div className="small muted">{pname(r.propertyId)} · {r.kind === "floor" ? "floor-level pattern" : "same room"}</div>
              <div className="small">{r.note}</div>
              <div className="xs muted">{r.taskIds.join(", ")}</div>
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="card">
            <h3>Issue mix</h3>
            {cats.map((c) => (
              <div key={c.category} style={{ marginBottom: "0.5rem" }}>
                <div className="row-between small"><span>{titleCase(c.category)}</span><span>{c.count}</span></div>
                <div className="bar gold" role="img" aria-label={`${c.count} ${c.category}`}><i style={{ width: `${(c.count / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Guest feedback themes</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Theme</th><th>Reviews</th><th>Avg ★</th><th>Negative</th><th>Related tasks</th><th></th></tr></thead>
              <tbody>{themes.map((s) => (
                <tr key={s.theme.id}><td>{s.theme.label}</td><td>{s.reviews}</td><td>{s.avgRating || "n/a"}</td><td>{s.negative}</td><td>{s.opsTasks}</td><td>{s.trend === "recurring" && <span className="badge b-danger">Recurring</span>}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Reviews, categorised <span className="badge b-sample">Fictional sample reviews</span></h3>
        {reviews.map((r) => {
          const sent = sentimentOf(r.rating);
          return (
            <div className="item" key={r.id}>
              <div className="row-between"><span className="small muted">{pname(r.propertyId)} · {r.source} · {r.rating}★</span><span className={`badge ${sent === "negative" ? "b-danger" : sent === "positive" ? "b-ok" : "b-warn"}`}>{sent}</span></div>
              <p className="small" style={{ margin: "0.3rem 0" }}>{r.text}</p>
              <div className="row">{themesOf(r.text).map((t) => <span key={t.id} className="badge b-gold">{t.label}</span>)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
