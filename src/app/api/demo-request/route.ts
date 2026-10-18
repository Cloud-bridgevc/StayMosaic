import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { EMAIL_RE, str } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Demo-booking intake. HubSpot is NOT connected in this build (see docs/HUBSPOT.md):
 * the request is validated and acknowledged, but nothing is stored or forwarded.
 * When HubSpot is connected this handler will map the fields to a Forms API submission
 * (contact + company), then a Lambda will create the deal and onboarding tasks.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "demo"), 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Honeypot: real users never fill this hidden field.
  if (typeof b.website === "string" && b.website.length > 0) return NextResponse.json({ ok: true });

  const name = str(b.name, 120)?.trim();
  const email = str(b.email, 200)?.trim();
  const company = str(b.company, 160)?.trim();
  const properties = Number(b.properties);
  const type = str(b.propertyType, 40);
  const message = b.message === undefined || b.message === "" ? "" : str(b.message, 1500);
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please enter your name.";
  if (!email || !EMAIL_RE.test(email)) errors.email = "Please enter a valid work email.";
  if (!company) errors.company = "Please enter your company or property group.";
  if (!Number.isInteger(properties) || properties < 1 || properties > 5000) errors.properties = "Enter the number of properties (1 or more).";
  if (!type || !["hotel", "serviced_apartment", "both"].includes(type)) errors.propertyType = "Choose a property type.";
  if (message === null) errors.message = "Message is too long.";
  if (b.consent !== true) errors.consent = "Please confirm you agree to be contacted about the demo.";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 400 });

  // Deliberately no PII in logs.
  console.log("[demo-request] validated submission", { propertyType: type, properties });
  return NextResponse.json({ ok: true, delivered: false, hubspot: "not_connected" }, { status: 202 });
}
