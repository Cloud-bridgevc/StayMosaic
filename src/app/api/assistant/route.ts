import { NextResponse } from "next/server";
import { answerQuestion, type AssistantContext } from "@/lib/assistant";
import { summarise } from "@/lib/bedrock";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * PROTOTYPE: scoping is applied in answerQuestion() using the user object the client sends.
 * Production must derive the user from a verified session, query PostgreSQL with row-level
 * property/department filters, and never accept the user or the data from the browser.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "assistant"), 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let b: Partial<AssistantContext> & { question?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (question.length < 2 || question.length > 400) {
    return NextResponse.json({ error: "question must be 2 to 400 characters" }, { status: 400 });
  }
  if (!b.user || !Array.isArray(b.tasks) || !Array.isArray(b.requests) || !Array.isArray(b.reviews) || !Array.isArray(b.staff) || !Array.isArray(b.properties)) {
    return NextResponse.json({ error: "Missing context" }, { status: 400 });
  }
  if (b.tasks.length > 1000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const result = answerQuestion(question, b as AssistantContext);
  let answer = result.answer;
  let source: "rules" | "bedrock" = "rules";
  if (!result.refused) {
    const prose = await summarise(
      "You answer a hotel staff member's operations question in one or two sentences.",
      { question, answer: result.answer, lines: result.lines.slice(0, 10) },
    );
    if (prose) {
      answer = prose;
      source = "bedrock";
    }
  }
  return NextResponse.json({ ...result, answer, source });
}
