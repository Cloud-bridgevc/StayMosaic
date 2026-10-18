import type { Classification, DepartmentId, Priority, RoutingRule, RuleSettings } from "./types";
import { PRIORITY_ORDER, priorityRank } from "./types";

export interface ClassifyInput {
  message: string;
  guestName?: string;
  vip?: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'/\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function matchTerms(text: string, rule: RoutingRule): string[] {
  const found: string[] = [];
  for (const raw of rule.keywords) {
    const kw = raw.trim().toLowerCase();
    if (!kw) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}([^a-z0-9]|$)`);
    if (re.test(text)) found.push(kw);
  }
  // Drop terms fully contained in a longer matched term ("hot water" subsumes "water").
  return found.filter((t) => !found.some((o) => o !== t && o.includes(t)));
}

const termScore = (t: string) => 1 + 0.5 * (t.split(" ").length - 1);

export function bumpPriority(p: Priority): Priority {
  return PRIORITY_ORDER[Math.min(priorityRank(p) + 1, PRIORITY_ORDER.length - 1)];
}

export interface RuleMatch {
  rule: RoutingRule;
  terms: string[];
  score: number;
}

/** Score every enabled rule against the message. Also used as the safety floor for Bedrock output. */
export function scoreRules(message: string, rules: RoutingRule[]): RuleMatch[] {
  const text = normalize(message);
  return rules
    .filter((r) => r.enabled)
    .map((rule) => {
      const terms = matchTerms(text, rule);
      return { rule, terms, score: terms.reduce((a, t) => a + termScore(t), 0) };
    })
    .filter((m) => m.score > 0)
    .sort(
      (a, b) =>
        Number(b.rule.safetyCritical) - Number(a.rule.safetyCritical) ||
        b.score - a.score ||
        priorityRank(b.rule.priority) - priorityRank(a.rule.priority),
    );
}

const REPLY_TEMPLATES: Record<string, (n: string) => string> = {
  safety: (n) => `Hello ${n}, thank you for letting us know. A member of our management team is on the way to you now. If anyone is in danger, please call emergency services.`,
  hvac: (n) => `Hello ${n}, I'm sorry about the temperature in your room. Our maintenance team will be with you shortly, and we can offer another room if it takes longer.`,
  plumbing: (n) => `Hello ${n}, I'm sorry about the water issue. Our maintenance team has been notified and will visit your room as soon as possible.`,
  electrical: (n) => `Hello ${n}, thanks for flagging this. Our maintenance team will take a look and we'll confirm once it's sorted.`,
  maintenance_other: (n) => `Hello ${n}, thank you for letting us know. We'll arrange a repair and confirm once it has been completed.`,
  cleaning: (n) => `Hello ${n}, I'm sorry the room wasn't to our standard. Our housekeeping supervisor will attend shortly.`,
  linen_amenities: (n) => `Hello ${n}, we'll bring that to your room shortly.`,
  noise: (n) => `Hello ${n}, I'm sorry you're being disturbed. We're looking into the source of the noise now and will update you.`,
  billing: (n) => `Hello ${n}, thanks for your message. Our front desk will review your bill and come back to you shortly.`,
  info_transport: (n) => `Hello ${n}, thanks for your message. Our front desk will confirm the details with you shortly.`,
  complaint: (n) => `Hello ${n}, we're sorry we haven't met your expectations. Our duty manager would like to speak with you personally.`,
  other: (n) => `Hello ${n}, thanks for getting in touch. A member of our team will respond shortly.`,
};

export function draftReply(category: string, guestName?: string): string {
  const first = (guestName ?? "").trim().split(/\s+/)[0] || "there";
  return (REPLY_TEMPLATES[category] ?? REPLY_TEMPLATES.other)(first);
}

export interface BuildArgs {
  rule: RoutingRule | null;
  terms: string[];
  additional: RuleMatch[];
  confidence: number;
  rationale: string;
  source: "rules" | "bedrock";
  input: ClassifyInput;
  settings: RuleSettings;
  extraFlags?: string[];
}

/** Single place where a rule becomes a recommendation, so rules and Bedrock paths cannot diverge. */
export function buildClassification(a: BuildArgs): Classification {
  const flags = [...(a.extraFlags ?? [])];
  let priority: Priority = a.rule?.priority ?? "normal";
  const department: DepartmentId = a.rule?.department ?? "reception";

  if (a.input.vip && a.settings.vipPriorityBump && a.rule) {
    const bumped = bumpPriority(priority);
    if (bumped !== priority) flags.push("VIP priority bump");
    priority = bumped;
  }
  if (a.rule?.safetyCritical) flags.push("Safety-critical rule");
  if (a.additional.length > 0) flags.push("Multiple issues in one message");

  let suggestEscalation = !!a.rule?.suggestEscalation || priority === "urgent";
  let escalationReason: string | undefined;
  if (a.rule?.safetyCritical) escalationReason = "Matched a safety-critical rule.";
  else if (a.rule?.suggestEscalation) escalationReason = `Rule "${a.rule.name}" recommends manager involvement.`;
  else if (priority === "urgent") escalationReason = "Priority is urgent.";
  if (a.input.vip && a.rule && priorityRank(priority) >= priorityRank("high") && a.rule.category === "complaint") {
    suggestEscalation = true;
    escalationReason = "VIP guest with a service complaint.";
  }

  const needsHumanTriage = !a.rule || a.confidence < a.settings.minConfidenceToRecommend;
  if (needsHumanTriage) flags.push("Needs human triage");

  const category = a.rule?.category ?? "other";
  return {
    ruleId: a.rule?.id ?? null,
    ruleName: a.rule?.name ?? "No matching rule",
    category,
    department,
    priority,
    action: a.rule?.action ?? "No configured rule matched. Front desk to read the message and triage manually.",
    slaMinutes: a.rule?.slaMinutes ?? 60,
    confidence: Math.round(a.confidence * 100) / 100,
    suggestEscalation,
    escalationReason,
    matchedTerms: a.terms,
    additional: a.additional.map((m) => ({ ruleId: m.rule.id, ruleName: m.rule.name, department: m.rule.department })),
    rationale: a.rationale,
    source: a.source,
    needsHumanTriage,
    flags,
    guestReplyDraft: draftReply(category, a.input.guestName),
  };
}

export function classifyWithRules(input: ClassifyInput, rules: RoutingRule[], settings: RuleSettings): Classification {
  const matches = scoreRules(input.message, rules);
  if (matches.length === 0) {
    return buildClassification({
      rule: null, terms: [], additional: [], confidence: 0.3, source: "rules", input, settings,
      rationale: "No enabled rule matched any term in the message.",
    });
  }
  const [best, ...rest] = matches;
  let confidence = Math.min(0.96, 0.5 + 0.14 * best.score);
  const extraFlags: string[] = [];
  const runnerUp = rest.find((m) => !m.rule.safetyCritical);
  if (!best.rule.safetyCritical && runnerUp && runnerUp.score >= best.score * 0.8 && runnerUp.rule.department !== best.rule.department) {
    confidence -= 0.15;
    extraFlags.push("Ambiguous between departments");
  }
  return buildClassification({
    rule: best.rule,
    terms: best.terms,
    additional: rest,
    confidence: Math.max(0.2, confidence),
    source: "rules",
    input,
    settings,
    extraFlags,
    rationale: `Matched "${best.terms.join('", "')}" → rule "${best.rule.name}".${rest.length ? ` Also detected: ${rest.map((m) => m.rule.name).join(", ")}.` : ""}`,
  });
}
