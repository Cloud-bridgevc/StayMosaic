import { NextResponse } from "next/server";
import { summarise } from "@/lib/bedrock";
import { buildHandover } from "@/lib/handover";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import type { GuestRequest, Property, StaffMember, Task } from "@/lib/types";

export const runtime = "nodejs";

/**
 * PROTOTYPE: the client posts the records it already holds. In production this route (or the
 * scheduled Lambda in infra/lambdas/shift-handover.ts) reads tasks from PostgreSQL by property,
 * after verifying the caller's session and property access.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "handover"), 15)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let b: { property?: Property; tasks?: Task[]; requests?: GuestRequest[]; staff?: StaffMember[]; generatedBy?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!b.property?.id || !Array.isArray(b.tasks) || !Array.isArray(b.requests) || !Array.isArray(b.staff)) {
    return NextResponse.json({ error: "property, tasks, requests and staff are required" }, { status: 400 });
  }
  if (b.tasks.length > 1000 || b.requests.length > 500 || b.staff.length > 200) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const report = buildHandover({
    property: b.property,
    tasks: b.tasks.filter((t) => t.propertyId === b.property!.id),
    requests: b.requests.filter((r) => r.propertyId === b.property!.id),
    staff: b.staff,
    generatedBy: String(b.generatedBy ?? "Unknown").slice(0, 80),
  });

  // Optional: Bedrock rewrites ONLY the narrative, using facts computed above.
  const prose = await summarise(
    "You write a calm, concise shift-handover opening paragraph for hotel supervisors.",
    { headline: report.headline, metrics: report.metrics, sections: report.sections.map((s) => ({ title: s.title, items: s.items.slice(0, 5) })) },
  );
  if (prose) {
    report.narrative = prose;
    report.source = "bedrock";
  }
  return NextResponse.json({ report });
}
