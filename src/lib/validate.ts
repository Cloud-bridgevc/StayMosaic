import type { Category, DepartmentId, Priority, RoutingRule, RuleSettings } from "./types";

const DEPTS: DepartmentId[] = ["reception", "housekeeping", "maintenance"];
const PRIS: Priority[] = ["low", "normal", "high", "urgent"];
const CATS: Category[] = ["safety", "hvac", "plumbing", "electrical", "maintenance_other", "cleaning", "linen_amenities", "noise", "billing", "info_transport", "complaint", "other"];

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);

export function sanitizeRules(input: unknown): RoutingRule[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) return null;
  const out: RoutingRule[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const id = str(r.id, 40), name = str(r.name, 120), action = str(r.action, 400), description = str(r.description, 300);
    if (!id || !name || !action || description === null) return null;
    if (!DEPTS.includes(r.department as DepartmentId) || !PRIS.includes(r.priority as Priority) || !CATS.includes(r.category as Category)) return null;
    if (!Array.isArray(r.keywords) || r.keywords.length > 100 || !r.keywords.every((k) => typeof k === "string" && k.length <= 60)) return null;
    const sla = Number(r.slaMinutes);
    if (!Number.isFinite(sla) || sla < 1 || sla > 10080) return null;
    out.push({
      id, name, action, description,
      enabled: r.enabled !== false,
      keywords: r.keywords as string[],
      category: r.category as Category,
      department: r.department as DepartmentId,
      priority: r.priority as Priority,
      slaMinutes: Math.round(sla),
      suggestEscalation: r.suggestEscalation === true,
      safetyCritical: r.safetyCritical === true,
    });
  }
  return out;
}

export function sanitizeSettings(input: unknown, fallback: RuleSettings): RuleSettings {
  if (typeof input !== "object" || input === null) return fallback;
  const s = input as Record<string, unknown>;
  const min = Number(s.minConfidenceToRecommend);
  return {
    vipPriorityBump: typeof s.vipPriorityBump === "boolean" ? s.vipPriorityBump : fallback.vipPriorityBump,
    minConfidenceToRecommend: Number.isFinite(min) ? Math.min(0.95, Math.max(0.1, min)) : fallback.minConfidenceToRecommend,
    requireStaffApproval: true,
  };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export { str };
