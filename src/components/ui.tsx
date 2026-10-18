import type { Classification, Priority, TaskStatus } from "@/lib/types";
import { titleCase } from "@/lib/format";

export const PriorityBadge = ({ p }: { p: Priority }) => <span className={`badge b-${p}`}>{p}</span>;

const STATUS_CLASS: Record<TaskStatus, string> = { open: "", in_progress: "b-gold", blocked: "b-warn", done: "b-ok" };
export const StatusBadge = ({ s }: { s: TaskStatus }) => <span className={`badge ${STATUS_CLASS[s]}`}>{titleCase(s)}</span>;

export const SampleBadge = ({ children = "Sample data" }: { children?: React.ReactNode }) => <span className="badge b-sample">{children}</span>;

export function Confidence({ value }: { value: number }) {
  return (
    <span title={`Confidence ${Math.round(value * 100)}%`}>
      <span className="conf"><i style={{ width: `${Math.round(value * 100)}%` }} /></span>
      <span className="xs muted">{Math.round(value * 100)}%</span>
    </span>
  );
}

export function EngineBadge({ source }: { source: Classification["source"] }) {
  return source === "bedrock"
    ? <span className="badge b-ai" title="Amazon Bedrock selected a configured rule">Bedrock</span>
    : <span className="badge" title="Deterministic keyword rules. Bedrock is not connected in this build.">Rules engine</span>;
}
