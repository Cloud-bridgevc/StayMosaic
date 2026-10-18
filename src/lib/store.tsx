"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { can, currentUser } from "./permissions";
import { createSampleState, STATE_VERSION } from "./sample-data";
import type {
  Classification, DepartmentId, GuestRequest, HandoverReport, OpsState, Priority, RoutingRule, RuleSettings, Task, TaskStatus,
} from "./types";

export const STATE_KEY = "staymosaic.demo.state";
export const INCOMING_KEY = "staymosaic.demo.incoming";

export interface ApproveOverrides {
  department?: DepartmentId;
  priority?: Priority;
  assigneeId?: string;
  title?: string;
}

export interface NewRequestInput {
  propertyId: string;
  guestName: string;
  room: string;
  vip: boolean;
  channel: GuestRequest["channel"];
  message: string;
  classification: Classification;
  attachments?: GuestRequest["attachments"];
}

interface Ctx {
  state: OpsState;
  now: number;
  setUser: (id: string) => void;
  setProperty: (id: string) => void;
  addRequest: (r: NewRequestInput) => GuestRequest;
  approveRequest: (id: string, o?: ApproveOverrides) => string | null;
  dismissRequest: (id: string) => void;
  updateTask: (id: string, patch: Partial<Pick<Task, "status" | "priority" | "blockedReason" | "detail">>) => void;
  assignTask: (id: string, staffId: string | undefined) => void;
  escalateTask: (id: string) => boolean;
  dismissEscalation: (id: string) => void;
  updateRule: (id: string, patch: Partial<RoutingRule>) => void;
  updateSettings: (patch: Partial<RuleSettings>) => void;
  saveHandover: (r: HandoverReport) => void;
  resetDemo: () => void;
}

const OpsContext = createContext<Ctx | null>(null);
export const useOps = () => {
  const c = useContext(OpsContext);
  if (!c) throw new Error("useOps outside OpsProvider");
  return c;
};

/** Least-loaded on-shift person in the department. A recommendation only; staff can override. */
export function suggestAssignee(state: OpsState, propertyId: string, dept: DepartmentId): string | undefined {
  const pool = state.staff.filter((s) => s.propertyId === propertyId && s.department === dept && s.onShift);
  const load = (id: string) => state.tasks.filter((t) => t.assigneeId === id && t.status !== "done").length;
  return pool.sort((a, b) => load(a.id) - load(b.id))[0]?.id;
}

function load(): OpsState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OpsState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* ignore corrupted or unavailable storage */
  }
  return createSampleState();
}

function drainIncoming(s: OpsState): OpsState {
  try {
    const raw = localStorage.getItem(INCOMING_KEY);
    if (!raw) return s;
    const incoming = JSON.parse(raw) as GuestRequest[];
    localStorage.removeItem(INCOMING_KEY);
    const known = new Set(s.requests.map((r) => r.id));
    const fresh = incoming.filter((r) => !known.has(r.id));
    return fresh.length ? { ...s, requests: [...fresh, ...s.requests] } : s;
  } catch {
    return s;
  }
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpsState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const ref = useRef<OpsState | null>(null);

  // Synchronous commit against the latest state: avoids stale reads and double-invoked updaters.
  const mutate = useCallback((fn: (s: OpsState) => OpsState) => {
    if (!ref.current) return;
    const next = fn(ref.current);
    if (next !== ref.current) {
      ref.current = next;
      setState(next);
    }
  }, []);

  useEffect(() => {
    const first = drainIncoming(load());
    ref.current = first;
    setState(first);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === INCOMING_KEY) mutate(drainIncoming);
    };
    const onFocus = () => mutate(drainIncoming);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(tick);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [mutate]);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [state]);

  const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq.current++).toString(36)}`;

  const audit = (s: OpsState, action: string, detail: string, targetId?: string): OpsState => ({
    ...s,
    audit: [{ id: uid("A"), at: Date.now(), actor: currentUser(s).name, action, targetId, detail }, ...s.audit].slice(0, 200),
  });

  const api = useMemo<Omit<Ctx, "state" | "now">>(
    () => ({
      setUser: (id) =>
        mutate((s) => {
          const u = s.users.find((x) => x.id === id);
          if (!u) return s;
          const sel = u.propertyIds.includes(s.selectedPropertyId) || (s.selectedPropertyId === "all" && u.propertyIds.length > 1) ? s.selectedPropertyId : u.propertyIds[0];
          return { ...s, currentUserId: id, selectedPropertyId: sel };
        }),
      setProperty: (id) => mutate((s) => ({ ...s, selectedPropertyId: id })),

      addRequest: (r) => {
        const req: GuestRequest = { ...r, id: uid("REQ"), receivedAt: Date.now(), status: "new" };
        mutate((s) => audit({ ...s, requests: [req, ...s.requests] }, "request_received", `New ${r.channel} request from Room ${r.room}.`, req.id));
        return req;
      },

      approveRequest: (id, o = {}) => {
        let taskId: string | null = null;
        mutate((s) => {
          const user = currentUser(s);
          const req = s.requests.find((r) => r.id === id);
          if (!req || req.status !== "new" || !can(user, "triage")) return s;
          const c = req.classification;
          const department = o.department ?? c.department;
          const priority = o.priority ?? c.priority;
          const assigneeId = o.assigneeId ?? suggestAssignee(s, req.propertyId, department);
          const t0 = Date.now();
          const task: Task = {
            id: uid("T"),
            propertyId: req.propertyId,
            requestId: req.id,
            source: "guest_request",
            department,
            category: c.category,
            title: o.title?.trim() || `${c.ruleName}: Room ${req.room}`,
            detail: req.message,
            room: req.room,
            priority,
            status: "open",
            assigneeId,
            createdAt: t0,
            dueAt: t0 + c.slaMinutes * 60_000,
            escalated: false,
            escalationSuggested: c.suggestEscalation,
            aiRecommended: true,
            approvedBy: user.name,
          };
          taskId = task.id;
          const changed = department !== c.department || priority !== c.priority;
          const next: OpsState = {
            ...s,
            tasks: [task, ...s.tasks],
            requests: s.requests.map((r) => (r.id === id ? { ...r, status: "converted", taskId: task.id } : r)),
          };
          return audit(next, "approve_request", `Created ${task.id} in ${department}/${priority}${changed ? " (staff changed the AI recommendation)" : " (AI recommendation accepted)"}.`, task.id);
        });
        return taskId;
      },

      dismissRequest: (id) =>
        mutate((s) => {
          if (!can(currentUser(s), "triage")) return s;
          return audit({ ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)) }, "dismiss_request", "Dismissed request without creating a task.", id);
        }),

      updateTask: (id, patch) =>
        mutate((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t || !can(currentUser(s), "update_task", t)) return s;
          const status = patch.status as TaskStatus | undefined;
          const next = s.tasks.map((x) =>
            x.id === id
              ? {
                  ...x, ...patch,
                  resolvedAt: status === "done" ? Date.now() : status ? undefined : x.resolvedAt,
                  blockedReason: status && status !== "blocked" ? undefined : patch.blockedReason ?? x.blockedReason,
                }
              : x,
          );
          return audit({ ...s, tasks: next }, "update_task", Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", "), id);
        }),

      assignTask: (id, staffId) =>
        mutate((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t || !can(currentUser(s), "assign", t)) return s;
          const who = s.staff.find((p) => p.id === staffId)?.name ?? "nobody";
          return audit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, assigneeId: staffId } : x)) }, "assign_task", `Assigned to ${who}.`, id);
        }),

      escalateTask: (id) => {
        let ok = false;
        mutate((s) => {
          const t = s.tasks.find((x) => x.id === id);
          const user = currentUser(s);
          if (!t || t.escalated || !can(user, "escalate", t)) return s;
          ok = true;
          return audit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, escalated: true, escalatedBy: user.name, escalationSuggested: true } : x)) }, "escalate", `Escalated by ${user.name}.`, id);
        });
        return ok;
      },

      dismissEscalation: (id) =>
        mutate((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t || !can(currentUser(s), "escalate", t)) return s;
          return audit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, escalationSuggestionDismissed: true } : x)) }, "dismiss_escalation", "Staff declined the AI escalation suggestion.", id);
        }),

      updateRule: (id, patch) =>
        mutate((s) => {
          if (!can(currentUser(s), "edit_rules")) return s;
          return audit({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }, "rule_update", `Rule ${id}: ${Object.keys(patch).join(", ")} changed.`, id);
        }),

      updateSettings: (patch) =>
        mutate((s) => {
          if (!can(currentUser(s), "edit_rules")) return s;
          return audit({ ...s, settings: { ...s.settings, ...patch } }, "settings_update", Object.keys(patch).join(", ") + " changed.");
        }),

      saveHandover: (r) => mutate((s) => audit({ ...s, handovers: [r, ...s.handovers].slice(0, 20) }, "handover_generated", `Generated ${r.shiftLabel} handover.`, r.id)),

      resetDemo: () => {
        try { localStorage.removeItem(INCOMING_KEY); } catch { /* ignore */ }
        const fresh = createSampleState();
        ref.current = fresh;
        setState(fresh);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate],
  );

  if (!state) return <div className="boot">Loading sample operations data…</div>;
  return <OpsContext.Provider value={{ state, now, ...api }}>{children}</OpsContext.Provider>;
}
