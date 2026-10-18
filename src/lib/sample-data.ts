import { DEFAULT_RULES, DEFAULT_SETTINGS } from "./rules";
import { classifyWithRules } from "./classifier";
import type {
  AuditEntry, Category, Channel, DemoUser, DepartmentId, GuestRequest, OpsState, Priority, Property, Review,
  StaffMember, Task, TaskSource, TaskStatus,
} from "./types";

/**
 * SAMPLE DATA ONLY. Every property, person, room, guest and review below is fictional and
 * exists to demonstrate the product. Nothing here is a real customer or guest record.
 */
export const STATE_VERSION = 3;
export const SAMPLE_DATA_LABEL = "Sample data: fictional hotel group, not real guests or staff.";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const PROPERTIES: Property[] = [
  { id: "p-alder", name: "Alder House Hotel", type: "hotel", city: "Edinburgh", units: 64 },
  { id: "p-linden", name: "Linden Court Residences", type: "serviced_apartment", city: "Manchester", units: 28 },
  { id: "p-marlow", name: "Marlow Quay Suites", type: "hotel", city: "Bristol", units: 42 },
];

export const STAFF: StaffMember[] = [
  { id: "s-priya", name: "Priya Nair", department: "reception", propertyId: "p-alder", onShift: true },
  { id: "s-marcus", name: "Marcus Bell", department: "reception", propertyId: "p-alder", onShift: true },
  { id: "s-elena", name: "Elena Voss", department: "reception", propertyId: "p-alder", onShift: false },
  { id: "s-tomas", name: "Tomas Lindqvist", department: "housekeeping", propertyId: "p-alder", onShift: true },
  { id: "s-aisha", name: "Aisha Karim", department: "housekeeping", propertyId: "p-alder", onShift: true },
  { id: "s-luis", name: "Luis Ortega", department: "housekeeping", propertyId: "p-alder", onShift: true },
  { id: "s-mei", name: "Mei Tanaka", department: "housekeeping", propertyId: "p-alder", onShift: false },
  { id: "s-joy", name: "Joy Mensah", department: "maintenance", propertyId: "p-alder", onShift: true },
  { id: "s-ben", name: "Ben Achterberg", department: "maintenance", propertyId: "p-alder", onShift: true },
  { id: "s-sam", name: "Sam Okoye", department: "maintenance", propertyId: "p-alder", onShift: false },
  { id: "s-hannah", name: "Hannah Cole", department: "reception", propertyId: "p-linden", onShift: true },
  { id: "s-rui", name: "Rui Santos", department: "housekeeping", propertyId: "p-linden", onShift: true },
  { id: "s-kofi", name: "Kofi Danso", department: "maintenance", propertyId: "p-linden", onShift: true },
  { id: "s-dara", name: "Dara Quinn", department: "reception", propertyId: "p-marlow", onShift: true },
  { id: "s-nia", name: "Nia Roberts", department: "housekeeping", propertyId: "p-marlow", onShift: true },
  { id: "s-ollie", name: "Ollie Grant", department: "maintenance", propertyId: "p-marlow", onShift: true },
];

const ALL_DEPTS: DepartmentId[] = ["reception", "housekeeping", "maintenance"];
export const USERS: DemoUser[] = [
  { id: "u-group", name: "Amara Okafor", title: "Group Operations Director", role: "group_manager", propertyIds: PROPERTIES.map((p) => p.id), departments: ALL_DEPTS },
  { id: "u-duty", name: "Daniel Reyes", title: "Duty Manager, Alder House", role: "duty_manager", propertyIds: ["p-alder"], departments: ALL_DEPTS },
  { id: "u-front", name: "Priya Nair", title: "Front Desk, Alder House", role: "front_desk", propertyIds: ["p-alder"], departments: ALL_DEPTS },
  { id: "u-hk", name: "Tomas Lindqvist", title: "Housekeeping Supervisor, Alder House", role: "housekeeping_supervisor", propertyIds: ["p-alder"], departments: ["housekeeping"] },
  { id: "u-mt", name: "Joy Mensah", title: "Maintenance Lead, Alder House", role: "maintenance_lead", propertyIds: ["p-alder"], departments: ["maintenance"] },
];

export function createSampleState(now: number = Date.now()): OpsState {
  const ago = (minutes: number) => now - minutes * MIN;
  let tn = 1000;
  let rn = 500;
  let an = 0;
  const tasks: Task[] = [];
  const requests: GuestRequest[] = [];
  const audit: AuditEntry[] = [];

  const defaultSla: Record<Priority, number> = { urgent: 15, high: 60, normal: 180, low: 480 };

  function task(o: {
    p?: string; dept: DepartmentId; cat: Category; title: string; detail?: string; room: string; pri: Priority;
    status?: TaskStatus; who?: string; createdMin: number; src?: TaskSource; esc?: boolean; escSuggested?: boolean;
    blocked?: string; resolvedMin?: number; requestId?: string; sla?: number;
  }): Task {
    const status = o.status ?? "open";
    const createdAt = ago(o.createdMin);
    const t: Task = {
      id: `T-${++tn}`,
      propertyId: o.p ?? "p-alder",
      requestId: o.requestId,
      source: o.src ?? "guest_request",
      department: o.dept,
      category: o.cat,
      title: o.title,
      detail: o.detail ?? "",
      room: o.room,
      priority: o.pri,
      status,
      assigneeId: o.who,
      createdAt,
      dueAt: createdAt + (o.sla ?? defaultSla[o.pri]) * MIN,
      resolvedAt: status === "done" ? ago(o.resolvedMin ?? Math.max(5, o.createdMin - 30)) : undefined,
      escalated: !!o.esc,
      escalatedBy: o.esc ? "Daniel Reyes" : undefined,
      escalationSuggested: !!(o.escSuggested || o.esc),
      blockedReason: o.blocked,
      aiRecommended: (o.src ?? "guest_request") === "guest_request",
      approvedBy: (o.src ?? "guest_request") === "guest_request" ? "Priya Nair" : undefined,
    };
    tasks.push(t);
    return t;
  }

  // ---- Alder House: open work right now ----
  task({ dept: "housekeeping", cat: "cleaning", title: "Turnover: Room 101", room: "101", pri: "normal", createdMin: 95, src: "scheduled", who: undefined });
  task({ dept: "housekeeping", cat: "cleaning", title: "Turnover: Room 102", room: "102", pri: "normal", status: "in_progress", who: "s-aisha", createdMin: 110, src: "scheduled" });
  task({ dept: "housekeeping", cat: "cleaning", title: "Deep clean: 6th floor corridor carpet", room: "Corridor 6", pri: "low", createdMin: 200, src: "scheduled" });
  task({ dept: "housekeeping", cat: "cleaning", title: "Re-clean Room 215 (bathroom not to standard)", detail: "Guest reported hair and limescale in the bathroom.", room: "215", pri: "high", status: "in_progress", who: "s-luis", createdMin: 85 });
  task({ dept: "housekeeping", cat: "linen_amenities", title: "Deliver 2 towels: Room 301", room: "301", pri: "normal", createdMin: 12 });
  task({ dept: "housekeeping", cat: "cleaning", title: "Turnover: Room 403", room: "403", pri: "normal", status: "blocked", blocked: "Wet carpet after AC leak. Waiting for maintenance to confirm the room is safe.", createdMin: 150, src: "scheduled", who: "s-tomas" });
  task({ dept: "housekeeping", cat: "cleaning", title: "Turnover: Room 205", room: "205", pri: "normal", status: "done", who: "s-aisha", createdMin: 240, src: "scheduled", resolvedMin: 140 });
  task({ dept: "housekeeping", cat: "cleaning", title: "Turnover: Room 206", room: "206", pri: "normal", status: "done", who: "s-luis", createdMin: 230, src: "scheduled", resolvedMin: 100 });
  task({ dept: "housekeeping", cat: "linen_amenities", title: "Extra pillows: Room 322", room: "322", pri: "normal", status: "done", who: "s-aisha", createdMin: 180, resolvedMin: 160 });

  task({ dept: "maintenance", cat: "plumbing", title: "No hot water: Room 304", detail: "Third hot-water report on floor 3 in 48 hours.", room: "304", pri: "high", status: "in_progress", who: "s-ben", createdMin: 80 });
  task({ dept: "maintenance", cat: "plumbing", title: "Lukewarm water only: Room 311", room: "311", pri: "high", createdMin: 50 });
  task({ dept: "maintenance", cat: "maintenance_other", title: "Lift 2: intermittent door sensor fault", detail: "Lift taken out of service overnight. Awaiting replacement sensor.", room: "Lift 2", pri: "high", status: "blocked", blocked: "Part on order from supplier. ETA Friday.", createdMin: 60 * 20, src: "staff_created", who: "s-joy", esc: true, sla: 24 * 60 });
  task({ dept: "maintenance", cat: "electrical", title: "TV remote not working: Room 118", room: "118", pri: "normal", createdMin: 40 });
  task({ dept: "maintenance", cat: "maintenance_other", title: "Wardrobe door off hinge: Room 220", room: "220", pri: "normal", createdMin: 300 });
  task({ dept: "maintenance", cat: "hvac", title: "AC fan noise: Room 207", room: "207", pri: "normal", status: "done", who: "s-joy", createdMin: 420, resolvedMin: 300 });

  task({ dept: "reception", cat: "billing", title: "Billing query: Room 502 (minibar charge)", room: "502", pri: "normal", who: "s-marcus", status: "in_progress", createdMin: 70 });
  task({ dept: "reception", cat: "noise", title: "Follow up with Room 218 on noise (night)", detail: "Third noise report from this room in 7 days.", room: "218", pri: "high", createdMin: 35, who: "s-priya", escSuggested: true });
  task({ dept: "reception", cat: "complaint", title: "Breakfast complaint: Room 330", detail: "Guest waited 40 min and was told the kitchen was understaffed. Asked for the duty manager.", room: "330", pri: "high", createdMin: 25, escSuggested: true });

  // ---- Recurring-issue history (done) so analytics have something real to find ----
  const hist = (d: number, h = 0) => d * 24 * 60 + h * 60;
  task({ dept: "maintenance", cat: "hvac", title: "AC not cooling: Room 412", room: "412", pri: "high", status: "done", who: "s-ben", createdMin: hist(9), resolvedMin: hist(9) - 90 });
  task({ dept: "maintenance", cat: "hvac", title: "AC not cooling: Room 412", room: "412", pri: "high", status: "done", who: "s-joy", createdMin: hist(5), resolvedMin: hist(5) - 120 });
  task({ dept: "maintenance", cat: "hvac", title: "AC making noise and warm: Room 412", room: "412", pri: "high", status: "done", who: "s-ben", createdMin: hist(2), resolvedMin: hist(2) - 70 });
  task({ dept: "reception", cat: "noise", title: "Noise complaint: Room 218", room: "218", pri: "high", status: "done", who: "s-marcus", createdMin: hist(7), resolvedMin: hist(7) - 40 });
  task({ dept: "reception", cat: "noise", title: "Noise complaint: Room 218", room: "218", pri: "high", status: "done", who: "s-priya", createdMin: hist(4), resolvedMin: hist(4) - 35 });
  task({ dept: "maintenance", cat: "plumbing", title: "No hot water: Room 318", room: "318", pri: "high", status: "done", who: "s-ben", createdMin: hist(2, 3), resolvedMin: hist(2, 1) });
  task({ dept: "maintenance", cat: "plumbing", title: "Cold shower: Room 306", room: "306", pri: "high", status: "done", who: "s-joy", createdMin: hist(1, 6), resolvedMin: hist(1, 4) });
  task({ dept: "maintenance", cat: "electrical", title: "Wi-Fi dropping: Room 140", room: "140", pri: "normal", status: "done", who: "s-joy", createdMin: hist(6), resolvedMin: hist(6) - 200 });
  task({ dept: "maintenance", cat: "electrical", title: "Wi-Fi dropping: Room 142", room: "142", pri: "normal", status: "done", who: "s-joy", createdMin: hist(5, 2), resolvedMin: hist(5, 2) - 150 });
  task({ dept: "maintenance", cat: "electrical", title: "No Wi-Fi: Room 148", room: "148", pri: "normal", status: "done", who: "s-ben", createdMin: hist(3), resolvedMin: hist(3) - 180 });
  task({ dept: "housekeeping", cat: "linen_amenities", title: "Towels not delivered: Room 301", room: "301", pri: "normal", status: "done", who: "s-aisha", createdMin: hist(6, 4), resolvedMin: hist(6, 3) });
  task({ dept: "housekeeping", cat: "linen_amenities", title: "Extra towels: Room 410", room: "410", pri: "normal", status: "done", who: "s-luis", createdMin: hist(3, 5), resolvedMin: hist(3, 5) - 40 });
  task({ dept: "housekeeping", cat: "cleaning", title: "Re-clean Room 215", room: "215", pri: "high", status: "done", who: "s-luis", createdMin: hist(8), resolvedMin: hist(8) - 80 });
  task({ dept: "reception", cat: "billing", title: "Billing query: Room 502", room: "502", pri: "normal", status: "done", who: "s-marcus", createdMin: hist(5, 6), resolvedMin: hist(5, 5) });

  // ---- Other properties ----
  task({ p: "p-linden", dept: "maintenance", cat: "plumbing", title: "Dishwasher leaking: Apartment 3", room: "Apt 3", pri: "high", who: "s-kofi", status: "in_progress", createdMin: 55 });
  task({ p: "p-linden", dept: "maintenance", cat: "electrical", title: "Hob not heating: Apartment 7", room: "Apt 7", pri: "normal", createdMin: 130 });
  task({ p: "p-linden", dept: "housekeeping", cat: "cleaning", title: "Departure clean: Apartment 12", room: "Apt 12", pri: "normal", who: "s-rui", status: "in_progress", createdMin: 90, src: "scheduled" });
  task({ p: "p-linden", dept: "housekeeping", cat: "linen_amenities", title: "Mid-stay linen change: Apartment 9", room: "Apt 9", pri: "low", createdMin: 240, src: "scheduled" });
  task({ p: "p-linden", dept: "reception", cat: "billing", title: "Utilities charge query: Apartment 5", room: "Apt 5", pri: "normal", who: "s-hannah", createdMin: 100 });
  task({ p: "p-linden", dept: "maintenance", cat: "plumbing", title: "Dishwasher leaking: Apartment 3", room: "Apt 3", pri: "high", status: "done", who: "s-kofi", createdMin: hist(6), resolvedMin: hist(6) - 120 });
  task({ p: "p-marlow", dept: "maintenance", cat: "hvac", title: "Heating not responding: Suite 21", room: "21", pri: "high", who: "s-ollie", status: "in_progress", createdMin: 45 });
  task({ p: "p-marlow", dept: "housekeeping", cat: "cleaning", title: "Turnover: Suite 8", room: "8", pri: "normal", createdMin: 70, src: "scheduled", who: "s-nia", status: "in_progress" });
  task({ p: "p-marlow", dept: "reception", cat: "info_transport", title: "Arrange early check-in: Suite 14", room: "14", pri: "normal", who: "s-dara", createdMin: 30 });
  task({ p: "p-marlow", dept: "maintenance", cat: "noise", title: "Plant room vibration heard in Suite 2", room: "2", pri: "high", createdMin: 600, esc: true, escSuggested: true, status: "open", sla: 12 * 60 });

  // ---- Unreviewed guest requests in the inbox (Alder House) ----
  const incoming: { min: number; guest: string; room: string; vip?: boolean; channel: Channel; msg: string }[] = [
    { min: 4, guest: "Charles Hale", room: "412", vip: true, channel: "web_form", msg: "Hi, the air con in our room is leaking water onto the carpet and it's very warm. Could someone come soon?" },
    { min: 9, guest: "Ana Ibarra", room: "305", channel: "web_form", msg: "Could we have two extra towels and a baby cot please?" },
    { min: 14, guest: "Peter Whitcombe", room: "218", channel: "messaging_sim", msg: "The music from the room next door is really loud again, we can't sleep." },
    { min: 17, guest: "Grace Mwangi", room: "120", channel: "front_desk_logged", msg: "Guest reports a strong smell of gas in the corridor near the stairwell." },
    { min: 21, guest: "Leila Haddad", room: "507", channel: "web_form", msg: "Can you book a taxi to the airport for 6am tomorrow? Also is a late checkout possible?" },
    { min: 28, guest: "Tom Eriksen", room: "310", channel: "web_form", msg: "The shower drain is blocked and there is a stain on the bed sheets." },
    { min: 33, guest: "Yuki Sato", room: "233", channel: "messaging_sim", msg: "Hello! What time does the spa open? Lovely stay so far." },
  ];
  for (const r of incoming) {
    requests.push({
      id: `REQ-${++rn}`,
      propertyId: "p-alder",
      guestName: r.guest,
      room: r.room,
      vip: !!r.vip,
      channel: r.channel,
      message: r.msg,
      receivedAt: ago(r.min),
      status: "new",
      classification: classifyWithRules({ message: r.msg, guestName: r.guest, vip: r.vip }, DEFAULT_RULES, DEFAULT_SETTINGS),
    });
  }

  audit.push(
    { id: `A-${++an}`, at: ago(60 * 20), actor: "Daniel Reyes", action: "escalate", targetId: "T-1012", detail: "Escalated Lift 2 fault to group engineering." },
    { id: `A-${++an}`, at: ago(60 * 6), actor: "Amara Okafor", action: "rule_update", targetId: "r-hvac", detail: "Changed HVAC SLA from 90 to 60 minutes." },
  );

  const reviews = buildReviews(now);

  return {
    version: STATE_VERSION,
    properties: PROPERTIES,
    staff: STAFF,
    users: USERS,
    requests,
    tasks,
    reviews,
    rules: DEFAULT_RULES.map((r) => ({ ...r, keywords: [...r.keywords] })),
    settings: { ...DEFAULT_SETTINGS },
    handovers: [],
    audit,
    currentUserId: "u-duty",
    selectedPropertyId: "p-alder",
  };
}

function buildReviews(now: number): Review[] {
  const d = (days: number) => now - days * DAY;
  const R = (id: number, propertyId: string, source: string, rating: number, daysAgo: number, text: string): Review => ({
    id: `RV-${id}`, propertyId, source, rating, at: d(daysAgo), text,
  });
  return [
    R(1, "p-alder", "Public review (sample)", 5, 1, "Beautiful lobby and the front desk team were wonderfully helpful. Lovely quiet room."),
    R(2, "p-alder", "Public review (sample)", 2, 2, "Room was too warm all night, the air conditioning wasn't working properly and it dripped. Staff were apologetic but it took a long time to fix."),
    R(3, "p-alder", "Post-stay survey (sample)", 3, 3, "Great location and comfy bed. But our neighbours were loud late at night and I could not sleep."),
    R(4, "p-alder", "Public review (sample)", 2, 3, "No hot water for two mornings in a row on the third floor. Disappointing for the price."),
    R(5, "p-alder", "Post-stay survey (sample)", 4, 4, "Friendly staff and spotless bathroom. Wi-Fi kept dropping though."),
    R(6, "p-alder", "Public review (sample)", 5, 5, "Breakfast was excellent and check-in was quick. Would stay again."),
    R(7, "p-alder", "Public review (sample)", 2, 6, "Breakfast service was very slow, we waited 40 minutes. Staff seemed overwhelmed."),
    R(8, "p-alder", "Post-stay survey (sample)", 3, 6, "Towels arrived very late after I asked twice. Otherwise fine."),
    R(9, "p-alder", "Public review (sample)", 1, 7, "Noise from the corridor and next door all night, and the AC in room 412 was broken again. Terrible experience."),
    R(10, "p-alder", "Post-stay survey (sample)", 4, 8, "Lovely stay. Wi-Fi was patchy in the room but staff offered a router. Very kind."),
    R(11, "p-alder", "Public review (sample)", 5, 9, "Immaculate room and lovely, attentive reception team."),
    R(12, "p-alder", "Public review (sample)", 3, 10, "Room had a smell on arrival and a stain on the carpet. Housekeeping fixed it quickly though."),
    R(13, "p-linden", "Post-stay survey (sample)", 4, 2, "Spacious apartment and good kitchen. The dishwasher leaked once but it was repaired the same day."),
    R(14, "p-linden", "Public review (sample)", 5, 5, "Perfect for a month-long work stay. Clean, quiet, great communication."),
    R(15, "p-linden", "Public review (sample)", 3, 7, "Billing for utilities was confusing and it took a few messages to get an explanation."),
    R(16, "p-marlow", "Public review (sample)", 4, 3, "Great views of the quay. Heating was slow to respond but fixed quickly."),
    R(17, "p-marlow", "Post-stay survey (sample)", 5, 6, "Wonderful, helpful staff and a spotless suite."),
  ];
}
