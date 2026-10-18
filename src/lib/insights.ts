import type { Category, DepartmentId, GuestRequest, Review, StaffMember, Task } from "./types";

const DAY = 86_400_000;

export interface RecurringIssue {
  key: string;
  kind: "room" | "floor";
  propertyId: string;
  label: string;
  category: Category;
  department: DepartmentId;
  count: number;
  lastAt: number;
  taskIds: string[];
  note: string;
}

const floorOf = (room: string) => (/^\d{3,}$/.test(room) ? room.slice(0, room.length - 2) : null);

/** Repeated issues in the same room, or the same fault across several rooms of one floor. */
export function recurringIssues(tasks: Task[], now: number = Date.now(), windowDays = 14): RecurringIssue[] {
  const recent = tasks.filter((t) => t.source !== "scheduled" && now - t.createdAt <= windowDays * DAY);
  const out: RecurringIssue[] = [];

  const byRoom = new Map<string, Task[]>();
  for (const t of recent) {
    if (!t.room || t.room.toLowerCase().startsWith("lift") || t.room.toLowerCase().startsWith("corridor")) continue;
    const k = `${t.propertyId}|${t.room}|${t.category}`;
    byRoom.set(k, [...(byRoom.get(k) ?? []), t]);
  }
  for (const [k, ts] of byRoom) {
    if (ts.length < 2) continue;
    const [propertyId, room, category] = k.split("|") as [string, string, Category];
    out.push({
      key: `room:${k}`, kind: "room", propertyId, category, department: ts[0].department,
      label: `Room ${room}`, count: ts.length, lastAt: Math.max(...ts.map((t) => t.createdAt)),
      taskIds: ts.map((t) => t.id),
      note: `${ts.length} ${category.replace("_", " ")} reports in ${windowDays} days. Consider a root-cause inspection or a room move.`,
    });
  }

  const byFloor = new Map<string, Task[]>();
  for (const t of recent) {
    const f = floorOf(t.room);
    if (!f) continue;
    const k = `${t.propertyId}|${f}|${t.category}`;
    byFloor.set(k, [...(byFloor.get(k) ?? []), t]);
  }
  for (const [k, ts] of byFloor) {
    const rooms = new Set(ts.map((t) => t.room));
    if (rooms.size < 3) continue;
    const [propertyId, floor, category] = k.split("|") as [string, string, Category];
    out.push({
      key: `floor:${k}`, kind: "floor", propertyId, category, department: ts[0].department,
      label: `Floor ${floor}`, count: ts.length, lastAt: Math.max(...ts.map((t) => t.createdAt)), taskIds: ts.map((t) => t.id),
      note: `${rooms.size} different rooms report the same ${category.replace("_", " ")} fault. This points to a shared system, not individual rooms.`,
    });
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

export interface DeptLoad {
  department: DepartmentId;
  open: number;
  inProgress: number;
  blocked: number;
  unassigned: number;
  overdue: number;
  oldestOpenMin: number;
  medianResolveMin: number | null;
  onShift: number;
  tasksPerOnShift: number | null;
}

export function departmentLoad(tasks: Task[], staff: StaffMember[], now: number = Date.now()): DeptLoad[] {
  const depts: DepartmentId[] = ["reception", "housekeeping", "maintenance"];
  return depts.map((department) => {
    const mine = tasks.filter((t) => t.department === department);
    const active = mine.filter((t) => t.status !== "done");
    const done = mine.filter((t) => t.status === "done" && t.resolvedAt);
    const times = done.map((t) => (t.resolvedAt! - t.createdAt) / 60000).sort((a, b) => a - b);
    const onShift = staff.filter((s) => s.department === department && s.onShift).length;
    return {
      department,
      open: active.length,
      inProgress: active.filter((t) => t.status === "in_progress").length,
      blocked: active.filter((t) => t.status === "blocked").length,
      unassigned: active.filter((t) => !t.assigneeId).length,
      overdue: active.filter((t) => t.dueAt < now).length,
      oldestOpenMin: active.length ? Math.round((now - Math.min(...active.map((t) => t.createdAt))) / 60000) : 0,
      medianResolveMin: times.length ? Math.round(times[Math.floor(times.length / 2)]) : null,
      onShift,
      tasksPerOnShift: onShift ? Math.round((active.length / onShift) * 10) / 10 : null,
    };
  });
}

export interface Bottleneck { department: DepartmentId; severity: "watch" | "act"; text: string }

export function bottlenecks(load: DeptLoad[]): Bottleneck[] {
  const out: Bottleneck[] = [];
  for (const l of load) {
    if (l.overdue >= 2) out.push({ department: l.department, severity: "act", text: `${l.overdue} tasks are past their SLA.` });
    else if (l.overdue === 1) out.push({ department: l.department, severity: "watch", text: "1 task is past its SLA." });
    if (l.unassigned >= 2) out.push({ department: l.department, severity: "watch", text: `${l.unassigned} open tasks have no assignee.` });
    if (l.blocked >= 1) out.push({ department: l.department, severity: "watch", text: `${l.blocked} blocked task${l.blocked > 1 ? "s" : ""} waiting on parts, access or approval.` });
    if (l.tasksPerOnShift !== null && l.tasksPerOnShift >= 4) out.push({ department: l.department, severity: "act", text: `${l.tasksPerOnShift} open tasks per person on shift.` });
  }
  return out;
}

export interface Theme { id: string; label: string; keywords: string[]; categories: Category[] }

export const THEMES: Theme[] = [
  { id: "temperature", label: "Temperature and air conditioning", keywords: ["air conditioning", "ac", "too warm", "too hot", "heating", "cold", "warm all night", "dripped"], categories: ["hvac"] },
  { id: "noise", label: "Noise", keywords: ["noise", "noisy", "loud", "neighbours", "neighbors", "music"], categories: ["noise"] },
  { id: "hot_water", label: "Hot water and plumbing", keywords: ["hot water", "shower", "drain", "leaked", "dishwasher", "cold shower"], categories: ["plumbing"] },
  { id: "wifi", label: "Wi-Fi and connectivity", keywords: ["wi-fi", "wifi", "internet", "router"], categories: ["electrical"] },
  { id: "cleanliness", label: "Cleanliness and room condition", keywords: ["smell", "stain", "dirty", "spotless", "immaculate", "clean"], categories: ["cleaning"] },
  { id: "speed", label: "Service speed", keywords: ["slow", "waited", "late", "took a long time", "twice", "overwhelmed"], categories: ["linen_amenities", "complaint"] },
  { id: "staff", label: "Staff and hospitality", keywords: ["staff", "reception", "front desk", "helpful", "friendly", "attentive", "kind", "welcoming"], categories: [] },
  { id: "billing", label: "Billing clarity", keywords: ["billing", "bill", "charge", "utilities"], categories: ["billing"] },
];

export type Sentiment = "positive" | "mixed" | "negative";
export const sentimentOf = (rating: number): Sentiment => (rating >= 4 ? "positive" : rating <= 2 ? "negative" : "mixed");

export function themesOf(text: string): Theme[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\-\s]/g, " ")} `;
  return THEMES.filter((th) => th.keywords.some((k) => t.includes(` ${k} `) || (k.length > 4 && t.includes(k))));
}

export interface ThemeSummary {
  theme: Theme;
  reviews: number;
  negative: number;
  avgRating: number;
  opsTasks: number; // tasks in last 14 days in the matching categories
  trend: "recurring" | "isolated";
}

export function feedbackThemes(reviews: Review[], tasks: Task[], requests: GuestRequest[], now: number = Date.now()): ThemeSummary[] {
  return THEMES.map((theme) => {
    const hits = reviews.filter((r) => themesOf(r.text).some((x) => x.id === theme.id));
    const opsTasks = tasks.filter((t) => theme.categories.includes(t.category) && t.source !== "scheduled" && now - t.createdAt <= 14 * DAY).length;
    const reqHits = requests.filter((q) => theme.categories.includes(q.classification.category)).length;
    const negative = hits.filter((r) => sentimentOf(r.rating) === "negative").length;
    return {
      theme,
      reviews: hits.length,
      negative,
      avgRating: hits.length ? Math.round((hits.reduce((a, r) => a + r.rating, 0) / hits.length) * 10) / 10 : 0,
      opsTasks: opsTasks + reqHits,
      trend: ((negative >= 2 || opsTasks + reqHits >= 4) && hits.length + opsTasks > 2 ? "recurring" : "isolated") as ThemeSummary["trend"],
    };
  })
    .filter((s) => s.reviews > 0 || s.opsTasks > 0)
    .sort((a, b) => b.negative - a.negative || b.opsTasks - a.opsTasks);
}

export function categoryCounts(tasks: Task[], now: number = Date.now(), windowDays = 14): { category: Category; count: number }[] {
  const m = new Map<Category, number>();
  for (const t of tasks) {
    if (t.source === "scheduled" || now - t.createdAt > windowDays * DAY) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + 1);
  }
  return [...m.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}
