const hits = new Map<string, number[]>();

/**
 * Tiny in-memory sliding-window limiter. Good enough to protect a single-instance demo;
 * on Lambda/multi-instance deployments use API Gateway throttling or WAF rate rules instead.
 */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const k of hits.keys()) { hits.delete(k); break; }
  return true;
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${scope}:${fwd || "local"}`;
}
