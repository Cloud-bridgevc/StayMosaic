export type DepartmentId = "reception" | "housekeeping" | "maintenance";
export type Priority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type RequestStatus = "new" | "converted" | "dismissed";
export type Channel = "web_form" | "messaging_sim" | "front_desk_logged";
export type TaskSource = "guest_request" | "scheduled" | "staff_created";
export type Role = "group_manager" | "duty_manager" | "front_desk" | "housekeeping_supervisor" | "maintenance_lead";

export type Category =
  | "safety"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "maintenance_other"
  | "cleaning"
  | "linen_amenities"
  | "noise"
  | "billing"
  | "info_transport"
  | "complaint"
  | "other";

export interface Property {
  id: string;
  name: string;
  type: "hotel" | "serviced_apartment";
  city: string;
  units: number;
}

export interface StaffMember {
  id: string;
  name: string;
  department: DepartmentId;
  propertyId: string;
  onShift: boolean;
}

export interface DemoUser {
  id: string;
  name: string;
  title: string;
  role: Role;
  propertyIds: string[]; // properties the user may see
  departments: DepartmentId[]; // departments the user may see
}

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  keywords: string[];
  category: Category;
  department: DepartmentId;
  priority: Priority;
  action: string; // recommended action text shown to staff
  slaMinutes: number;
  suggestEscalation: boolean;
  safetyCritical: boolean; // matches here can never be down-prioritised by AI or settings
}

export interface RuleSettings {
  vipPriorityBump: boolean;
  minConfidenceToRecommend: number; // below this the request is flagged "needs human triage"
  // Locked by design: AI never creates tasks, escalates, or messages guests on its own.
  requireStaffApproval: true;
}

export interface Classification {
  ruleId: string | null;
  ruleName: string;
  category: Category;
  department: DepartmentId;
  priority: Priority;
  action: string;
  slaMinutes: number;
  confidence: number;
  suggestEscalation: boolean;
  escalationReason?: string;
  matchedTerms: string[];
  additional: { ruleId: string; ruleName: string; department: DepartmentId }[];
  rationale: string;
  source: "rules" | "bedrock";
  needsHumanTriage: boolean;
  flags: string[];
  guestReplyDraft: string; // draft only. Staff review and send; sending is not operational.
}

export interface GuestRequest {
  id: string;
  propertyId: string;
  guestName: string;
  room: string;
  vip: boolean;
  channel: Channel;
  message: string;
  receivedAt: number;
  status: RequestStatus;
  classification: Classification;
  taskId?: string;
  attachments?: { name: string; type: string; size: number }[];
}

export interface Task {
  id: string;
  propertyId: string;
  requestId?: string;
  source: TaskSource;
  department: DepartmentId;
  category: Category;
  title: string;
  detail: string;
  room: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId?: string;
  createdAt: number;
  dueAt: number;
  resolvedAt?: number;
  escalated: boolean;
  escalatedBy?: string;
  escalationSuggested: boolean;
  escalationSuggestionDismissed?: boolean;
  blockedReason?: string;
  aiRecommended: boolean;
  approvedBy?: string;
}

export interface Review {
  id: string;
  propertyId: string;
  source: string;
  rating: number;
  text: string;
  at: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  action: string;
  targetId?: string;
  detail: string;
}

export interface HandoverSection {
  title: string;
  items: string[];
}

export interface HandoverReport {
  id: string;
  propertyId: string;
  generatedAt: number;
  generatedBy: string;
  shiftLabel: string;
  headline: string;
  narrative: string;
  sections: HandoverSection[];
  metrics: { open: number; urgent: number; overdue: number; escalated: number; unreviewedRequests: number };
  source: "rules" | "bedrock";
}

export interface OpsState {
  version: number;
  properties: Property[];
  staff: StaffMember[];
  users: DemoUser[];
  requests: GuestRequest[];
  tasks: Task[];
  reviews: Review[];
  rules: RoutingRule[];
  settings: RuleSettings;
  handovers: HandoverReport[];
  audit: AuditEntry[];
  currentUserId: string;
  selectedPropertyId: string; // property id or "all"
}

export const DEPARTMENTS: { id: DepartmentId; label: string }[] = [
  { id: "reception", label: "Reception" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Maintenance" },
];

export const PRIORITY_ORDER: Priority[] = ["low", "normal", "high", "urgent"];
export const priorityRank = (p: Priority) => PRIORITY_ORDER.indexOf(p);
