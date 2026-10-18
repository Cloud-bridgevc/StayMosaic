import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Issues a short-lived presigned PUT URL so the browser uploads straight to S3.
 * NOT CONNECTED in this build: returns 501 until S3_BUCKET (and AWS credentials) are set.
 * Production also needs: authenticated callers, a bucket with Block Public Access, SSE-KMS,
 * a lifecycle rule, and the attachment-processor Lambda (malware scan) before staff can open files.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "presign"), 10)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let b: { filename?: unknown; contentType?: unknown; size?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const contentType = typeof b.contentType === "string" ? b.contentType : "";
  const size = Number(b.size);
  const filename = typeof b.filename === "string" ? b.filename : "";
  if (!ALLOWED.has(contentType)) return NextResponse.json({ error: "Only JPEG, PNG, WebP and PDF files are supported." }, { status: 415 });
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: "File must be between 1 byte and 8 MB." }, { status: 413 });
  if (!filename || filename.length > 200) return NextResponse.json({ error: "Invalid filename." }, { status: 400 });

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: "Attachments are not enabled: Amazon S3 is not connected in this build." }, { status: 501 });
  }

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const key = `attachments/${randomUUID()}/${safe}`;
    const client = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size, ServerSideEncryption: "aws:kms" }),
      { expiresIn: 300 },
    );
    return NextResponse.json({ url, key, expiresInSeconds: 300 });
  } catch (err) {
    console.error("[presign] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not create upload URL." }, { status: 502 });
  }
}
