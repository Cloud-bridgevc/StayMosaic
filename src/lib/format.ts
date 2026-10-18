export function ago(ts: number, now: number = Date.now()): string {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60 ? `${m % 60}m ` : ""}ago`.replace("  ", " ");
  return `${Math.floor(h / 24)}d ago`;
}

export function dueIn(ts: number, now: number = Date.now()): { label: string; overdue: boolean } {
  const m = Math.round((ts - now) / 60000);
  if (m < 0) {
    const a = Math.abs(m);
    return { label: a < 60 ? `${a}m overdue` : `${Math.floor(a / 60)}h overdue`, overdue: true };
  }
  if (m < 60) return { label: `due in ${m}m`, overdue: false };
  return { label: `due in ${Math.floor(m / 60)}h`, overdue: false };
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
