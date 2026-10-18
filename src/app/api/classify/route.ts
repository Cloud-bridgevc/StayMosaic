import { NextResponse } from "next/server";
import { bedrockConfigured, classifyRequest } from "@/lib/bedrock";
import { DEFAULT_RULES, DEFAULT_SETTINGS } from "@/lib/rules";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { sanitizeRules, sanitizeSettings } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "classify"), 30)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 3 || message.length > 2000) {
    return NextResponse.json({ error: "message must be 3 to 2000 characters" }, { status: 400 });
  }
  const rules = body.rules === undefined ? DEFAULT_RULES : sanitizeRules(body.rules);
  if (!rules) return NextResponse.json({ error: "Invalid rules payload" }, { status: 400 });
  const settings = sanitizeSettings(body.settings, DEFAULT_SETTINGS);
  const guestName = typeof body.guestName === "string" ? body.guestName.slice(0, 80) : undefined;

  const classification = await classifyRequest({ message, guestName, vip: body.vip === true }, rules, settings);
  return NextResponse.json({ classification, engine: { bedrockConfigured: bedrockConfigured(), used: classification.source } });
}
