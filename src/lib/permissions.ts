import type { DemoUser, DepartmentId, GuestRequest, OpsState, Task } from "./types";

export type Action = "triage" | "escalate" | "edit_rules" | "update_task" | "assign" | "generate_handover";

/**
 * Role checks used by the UI and the API layer.
 * PROTOTYPE NOTE: the demo "Viewing as" switcher is NOT authentication. A production build
 * must resolve the user from a verified session (e.g. Cognito/OIDC) and enforce the same
 * checks server-side against PostgreSQL row data.
 */
export function can(user: DemoUser, action: Action, task?: Pick<Task, "department" | "propertyId">): boolean {
  const inScope = !task || (user.propertyIds.includes(task.propertyId) && user.departments.includes(task.department));
  if (!inScope) return false;
  switch (action) {
    case "triage":
      return ["group_manager", "duty_manager", "front_desk"].includes(user.role);
    case "escalate":
      return ["group_manager", "duty_manager", "housekeeping_supervisor", "maintenance_lead"].includes(user.role);
    case "edit_rules":
      return ["group_manager", "duty_manager"].includes(user.role);
    case "assign":
      return ["group_manager", "duty_manager", "housekeeping_supervisor", "maintenance_lead"].includes(user.role);
    case "update_task":
      return true;
    case "generate_handover":
      return true;
  }
}

export const currentUser = (s: OpsState): DemoUser => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0];

export function visibleProperties(s: OpsState) {
  const u = currentUser(s);
  return s.properties.filter((p) => u.propertyIds.includes(p.id));
}

/** Properties in scope for the current user AND the property selector. */
export function scopeIds(s: OpsState): string[] {
  const u = currentUser(s);
  const allowed = u.propertyIds;
  return s.selectedPropertyId === "all" ? allowed : allowed.filter((id) => id === s.selectedPropertyId);
}

export function visibleTasks(s: OpsState): Task[] {
  const u = currentUser(s);
  const ids = scopeIds(s);
  return s.tasks.filter((t) => ids.includes(t.propertyId) && u.departments.includes(t.department));
}

export function visibleRequests(s: OpsState): GuestRequest[] {
  const u = currentUser(s);
  const ids = scopeIds(s);
  // Requests are visible to roles that triage, or when the AI routed them into the user's department.
  return s.requests.filter(
    (r) => ids.includes(r.propertyId) && (can(u, "triage") || u.departments.includes(r.classification.department)),
  );
}

export const deptAllowed = (u: DemoUser, d: DepartmentId) => u.departments.includes(d);
