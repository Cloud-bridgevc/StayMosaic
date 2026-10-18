/**
 * SCAFFOLD: not deployed, not run. S3 ObjectCreated trigger for attachments/.
 * Verifies type and size by inspecting the object. A malware-scanning step (for example a
 * third-party scanner or GuardDuty Malware Protection for S3) must set scan_status = 'clean'
 * before staff are given a download link. Until then files stay 'pending' and are not served.
 */
import type { S3Event } from "aws-lambda";
import { db } from "./db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX = 8 * 1024 * 1024;

export const handler = async (event: S3Event): Promise<void> => {
  const pool = await db();
  for (const rec of event.Records) {
    const key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, " "));
    const size = rec.s3.object.size;
    const ok = size > 0 && size <= MAX;
    await pool.query("UPDATE attachments SET scan_status = $2 WHERE s3_key = $1 AND content_type = ANY($3)", [key, ok ? "pending" : "failed", [...ALLOWED]]);
    if (!ok) console.warn("attachment rejected by size", { key, size });
  }
};
