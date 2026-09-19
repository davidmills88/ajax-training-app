import { emptyConsentQuestionnaire, validateConsent } from "./consent.js";
import {
  buildClientSummary,
  emptyClientSummary,
  filledDemoSection,
  isOnboardingSectionId,
  validateSectionAnswers,
} from "./onboarding.js";
import {
  DEMO_BLOCK,
  DEMO_MEMBER_EMAIL,
  isCoachRole,
  validateCreateBlock,
  type CreateBlockInput,
  type LogWorkoutInput,
  type Program,
  type ProgramAssignment,
  type TrainingHome,
  type Workout,
  type WorkoutDetail,
  type WorkoutLog,
  type WorkoutSegment,
} from "./training.js";
import {
  AJAX_TENANT_ID,
  TENANT_SLUG_AJAX,
  type ClientSummary,
  type ConsentKind,
  type ConsentQuestionnaire,
  type ConsentRecord,
  type MePayload,
  type OnboardingAnswers,
  type OnboardingProfile,
  type OnboardingSectionId,
  type RosterEntry,
  type Session,
  type SessionUser,
} from "./types.js";

export type AjaxStoreErrorCode =
  | "not_on_roster"
  | "inactive_roster"
  | "invalid_consent"
  | "invalid_section"
  | "section_incomplete"
  | "confirm_out_of_order"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "invalid_block"
  | "invalid_log";

export class AjaxStoreError extends Error {
  constructor(
    public readonly code: AjaxStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AjaxStoreError";
  }
}

export type TokenClaims = {
  sub: string;
  email: string;
  tenantId: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const DEFAULT_AJAX_ROSTER: Omit<RosterEntry, "id" | "tenantId">[] = [
  { email: "david@ajaxgym.com", fullName: "David Mills", status: "active" },
  { email: "seth@ajaxgym.com", fullName: "Seth", status: "active" },
  { email: "member@ajax.local", fullName: "Demo Member", status: "active" },
  { email: "playwright@ajax.local", fullName: "Playwright Guest", status: "active" },
];

export class InMemoryAjaxStore {
  readonly tenantId = AJAX_TENANT_ID;
  readonly tenantSlug = TENANT_SLUG_AJAX;
  readonly mode = "mock" as const;

  private roster = new Map<string, RosterEntry>();
  private users = new Map<string, SessionUser>();
  private usersByEmail = new Map<string, string>();
  private consents = new Map<string, ConsentRecord>();
  private onboarding = new Map<string, OnboardingProfile>();
  private programs = new Map<string, Program>();
  private workouts = new Map<string, Workout>();
  private assignments = new Map<string, ProgramAssignment>();
  private logs = new Map<string, WorkoutLog>();

  constructor(seed: Omit<RosterEntry, "id" | "tenantId">[] = DEFAULT_AJAX_ROSTER) {
    for (const row of seed) {
      this.addRoster(row.email, row.fullName, row.status);
    }
    this.seedDemoBlock();
  }

  addRoster(email: string, fullName: string, status: RosterEntry["status"] = "active"): RosterEntry {
    const normalized = normalizeEmail(email);
    const existing = this.roster.get(normalized);
    if (existing) {
      existing.fullName = fullName;
      existing.status = status;
      return existing;
    }
    const entry: RosterEntry = {
      id: id("ros"),
      tenantId: this.tenantId,
      email: normalized,
      fullName,
      status,
    };
    this.roster.set(normalized, entry);
    return entry;
  }

  findRoster(email: string): RosterEntry | undefined {
    return this.roster.get(normalizeEmail(email));
  }

  listRoster(): RosterEntry[] {
    return [...this.roster.values()];
  }

  issueSession(email: string): Session {
    const roster = this.findRoster(email);
    if (!roster) {
      throw new AjaxStoreError("not_on_roster", "This email is not on the Ajax member list yet.");
    }
    if (roster.status !== "active") {
      throw new AjaxStoreError("inactive_roster", "This membership is not active.");
    }

    let userId = this.usersByEmail.get(roster.email);
    if (!userId) {
      userId = id("usr");
      const user: SessionUser = {
        id: userId,
        tenantId: this.tenantId,
        email: roster.email,
        fullName: roster.fullName,
        role: roster.email === "david@ajaxgym.com" ? "owner" : "member",
      };
      this.users.set(userId, user);
      this.usersByEmail.set(roster.email, userId);
    }

    const user = this.users.get(userId)!;
    return {
      accessToken: encodeMockToken({ sub: user.id, email: user.email, tenantId: user.tenantId }),
      user,
      mode: "mock",
    };
  }

  userFromToken(token: string): SessionUser {
    const claims = decodeMockToken(token);
    const existing = this.users.get(claims.sub);
    if (existing && existing.tenantId === claims.tenantId) return existing;

    const roster = this.findRoster(claims.email);
    if (!roster || claims.tenantId !== this.tenantId) {
      throw new AjaxStoreError("unauthorized", "Session is not valid.");
    }
    const user: SessionUser = {
      id: claims.sub,
      tenantId: claims.tenantId,
      email: roster.email,
      fullName: roster.fullName,
      role: roster.email === "david@ajaxgym.com" ? "owner" : "member",
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);
    return user;
  }

  getMe(user: SessionUser): MePayload {
    const onboarding = this.onboarding.get(user.id) ?? null;
    const consent = this.consents.get(user.id) ?? null;
    return {
      user,
      roster: this.findRoster(user.email) ?? null,
      consent,
      onboarding,
      next: nextStep(consent, onboarding),
    };
  }

  saveConsent(user: SessionUser, questionnaire: ConsentQuestionnaire): ConsentRecord {
    const errors = validateConsent(questionnaire);
    if (errors.length) {
      throw new AjaxStoreError("invalid_consent", errors.join(" "));
    }
    const record: ConsentRecord = {
      id: this.consents.get(user.id)?.id ?? id("con"),
      tenantId: user.tenantId,
      userId: user.id,
      kind: "account_privacy",
      questionnaire,
      acceptedAt: nowIso(),
    };
    this.consents.set(user.id, record);
    return record;
  }

  getOnboarding(user: SessionUser): OnboardingProfile {
    const existing = this.onboarding.get(user.id);
    if (existing) return existing;
    const created: OnboardingProfile = {
      id: id("onb"),
      tenantId: user.tenantId,
      userId: user.id,
      currentSection: 1,
      sections: {},
      confirmedSections: [],
      clientSummary: null,
      completedAt: null,
      updatedAt: nowIso(),
    };
    this.onboarding.set(user.id, created);
    return created;
  }

  saveSection(user: SessionUser, sectionId: number, answers: OnboardingAnswers): OnboardingProfile {
    if (!isOnboardingSectionId(sectionId)) {
      throw new AjaxStoreError("invalid_section", "Section must be 1–9.");
    }
    const profile = this.getOnboarding(user);
    const expected = nextUnconfirmed(profile);
    if (sectionId !== expected && !profile.confirmedSections.includes(sectionId)) {
      throw new AjaxStoreError("confirm_out_of_order", `Complete section ${expected} first.`);
    }
    const errors = validateSectionAnswers(sectionId, answers);
    if (errors.length) {
      throw new AjaxStoreError("section_incomplete", errors.join(" "));
    }
    profile.sections[sectionId] = answers;
    profile.currentSection = sectionId;
    profile.updatedAt = nowIso();
    if (profile.completedAt) {
      profile.clientSummary = buildClientSummary(profile.sections);
    }
    return profile;
  }

  confirmSection(user: SessionUser, sectionId: number): OnboardingProfile {
    if (!isOnboardingSectionId(sectionId)) {
      throw new AjaxStoreError("invalid_section", "Section must be 1–9.");
    }
    const profile = this.getOnboarding(user);
    if (!profile.sections[sectionId]) {
      throw new AjaxStoreError("section_incomplete", "Save answers before confirming this section.");
    }
    const expected = nextUnconfirmed(profile);
    if (sectionId !== expected && !profile.confirmedSections.includes(sectionId)) {
      throw new AjaxStoreError("confirm_out_of_order", `Confirm section ${expected} first.`);
    }
    if (!profile.confirmedSections.includes(sectionId)) {
      profile.confirmedSections = [...profile.confirmedSections, sectionId].sort((a, b) => a - b) as OnboardingSectionId[];
    }
    const next = nextUnconfirmed(profile);
    profile.currentSection = next;
    if (profile.confirmedSections.length === 9) {
      profile.clientSummary = buildClientSummary(profile.sections);
    }
    profile.updatedAt = nowIso();
    return profile;
  }

  updateSummary(user: SessionUser, summary: ClientSummary): OnboardingProfile {
    const profile = this.getOnboarding(user);
    if (profile.confirmedSections.length < 9) {
      throw new AjaxStoreError("section_incomplete", "Confirm all nine sections before editing the client summary.");
    }
    profile.clientSummary = { ...emptyClientSummary(), ...summary };
    profile.updatedAt = nowIso();
    return profile;
  }

  completeOnboarding(user: SessionUser): OnboardingProfile {
    const profile = this.getOnboarding(user);
    if (profile.confirmedSections.length < 9) {
      throw new AjaxStoreError("section_incomplete", "Confirm all nine sections first.");
    }
    if (!profile.clientSummary) {
      profile.clientSummary = buildClientSummary(profile.sections);
    }
    profile.completedAt = nowIso();
    profile.updatedAt = nowIso();
    return profile;
  }

  createBlock(actor: SessionUser, input: CreateBlockInput): Program {
    this.assertCoach(actor);
    const errors = validateCreateBlock(input);
    if (errors.length) throw new AjaxStoreError("invalid_block", errors.join(" "));
    const durationWeeks = input.durationWeeks ?? 6;
    const program: Program = {
      id: id("prg"),
      tenantId: this.tenantId,
      title: input.title.trim(),
      notes: input.notes?.trim() ?? "",
      durationWeeks,
      createdAt: nowIso(),
    };
    this.programs.set(program.id, program);
    input.workouts.forEach((row, index) => {
      const workout: Workout = {
        id: id("wko"),
        tenantId: this.tenantId,
        programId: program.id,
        week: row.week,
        day: row.day,
        sortOrder: row.sortOrder ?? index,
        title: row.title.trim(),
        notes: row.notes?.trim() ?? "",
        videoUrl: row.videoUrl?.trim() || null,
        segments: normalizeSegments(row.segments),
      };
      this.workouts.set(workout.id, workout);
    });
    return program;
  }

  assignBlock(actor: SessionUser, programId: string, email: string): ProgramAssignment {
    this.assertCoach(actor);
    const program = this.programs.get(programId);
    if (!program) throw new AjaxStoreError("not_found", "That block does not exist.");
    const roster = this.findRoster(email);
    if (!roster) throw new AjaxStoreError("not_on_roster", "This email is not on the Ajax member list yet.");
    if (roster.status !== "active") {
      throw new AjaxStoreError("inactive_roster", "This membership is not active.");
    }
    const memberEmail = roster.email;
    for (const row of this.assignments.values()) {
      if (row.memberEmail === memberEmail && row.status === "active") {
        row.status = "inactive";
      }
    }
    const userId = this.usersByEmail.get(memberEmail) ?? null;
    const assignment: ProgramAssignment = {
      id: id("asg"),
      tenantId: this.tenantId,
      programId: program.id,
      memberEmail,
      userId,
      status: "active",
      assignedAt: nowIso(),
    };
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  listBlocks(actor: SessionUser): Program[] {
    this.assertCoach(actor);
    return [...this.programs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getBlock(actor: SessionUser, programId: string): { program: Program; workouts: Workout[]; assignments: ProgramAssignment[] } {
    this.assertCoach(actor);
    const program = this.programs.get(programId);
    if (!program) throw new AjaxStoreError("not_found", "That block does not exist.");
    return {
      program,
      workouts: this.workoutsForProgram(program.id),
      assignments: [...this.assignments.values()].filter((row) => row.programId === program.id),
    };
  }

  getTrainingHome(user: SessionUser): TrainingHome {
    const assignment = this.activeAssignmentFor(user.email);
    if (!assignment) return { assignment: null, program: null, workouts: [] };
    this.touchAssignmentUser(assignment, user);
    const program = this.programs.get(assignment.programId) ?? null;
    const workouts = this.workoutsForProgram(assignment.programId).map((workout) => ({
      ...workout,
      log: this.findLog(user.id, workout.id, assignment.id),
    }));
    return { assignment, program, workouts };
  }

  getWorkoutDetail(user: SessionUser, workoutId: string): WorkoutDetail {
    const home = this.getTrainingHome(user);
    if (!home.assignment || !home.program) {
      throw new AjaxStoreError("not_found", "No block is assigned yet.");
    }
    const workout = home.workouts.find((row) => row.id === workoutId);
    if (!workout) throw new AjaxStoreError("not_found", "That workout is not on your current block.");
    return {
      assignment: home.assignment,
      program: home.program,
      workout,
      log: workout.log,
    };
  }

  logWorkout(user: SessionUser, workoutId: string, input: LogWorkoutInput): WorkoutLog {
    const detail = this.getWorkoutDetail(user, workoutId);
    const existing = detail.log;
    const record: WorkoutLog = {
      id: existing?.id ?? id("log"),
      tenantId: user.tenantId,
      userId: user.id,
      workoutId,
      assignmentId: detail.assignment.id,
      weight: normalizeMetric(input.weight, existing?.weight ?? null),
      reps: normalizeMetric(input.reps, existing?.reps ?? null),
      score: normalizeMetric(input.score, existing?.score ?? null),
      notes: input.notes !== undefined ? String(input.notes) : existing?.notes ?? "",
      completedAt: existing?.completedAt ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
    };
    if (input.completed === true) record.completedAt = nowIso();
    if (input.completed === false) record.completedAt = null;
    this.logs.set(logKey(user.id, workoutId, detail.assignment.id), record);
    return record;
  }

  private assertCoach(actor: SessionUser) {
    if (!isCoachRole(actor.role)) {
      throw new AjaxStoreError("forbidden", "Only a coach or owner can create and assign blocks.");
    }
  }

  private seedDemoBlock() {
    const owner: SessionUser = {
      id: "usr_seed_owner",
      tenantId: this.tenantId,
      email: "david@ajaxgym.com",
      fullName: "David Mills",
      role: "owner",
    };
    const program = this.createBlock(owner, DEMO_BLOCK);
    this.assignBlock(owner, program.id, DEMO_MEMBER_EMAIL);
    const member = this.issueSession(DEMO_MEMBER_EMAIL).user;
    this.saveConsent(member, {
      ...emptyConsentQuestionnaire(),
      isAdult: true,
      understandProfileStorage: true,
      acceptTerms: true,
      understandLaterConsents: true,
      hearAboutUs: "Seeded demo",
    });
    for (let section = 1; section <= 9; section += 1) {
      this.saveSection(member, section, filledDemoSection(section as OnboardingSectionId));
      this.confirmSection(member, section);
    }
    this.completeOnboarding(member);
  }

  private activeAssignmentFor(email: string): ProgramAssignment | undefined {
    const normalized = normalizeEmail(email);
    return [...this.assignments.values()]
      .filter((row) => row.memberEmail === normalized && row.status === "active")
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0];
  }

  private touchAssignmentUser(assignment: ProgramAssignment, user: SessionUser) {
    if (assignment.userId !== user.id) {
      assignment.userId = user.id;
    }
  }

  private workoutsForProgram(programId: string): Workout[] {
    return [...this.workouts.values()]
      .filter((row) => row.programId === programId)
      .sort((a, b) => a.week - b.week || a.day - b.day || a.sortOrder - b.sortOrder);
  }

  private findLog(userId: string, workoutId: string, assignmentId: string): WorkoutLog | null {
    return this.logs.get(logKey(userId, workoutId, assignmentId)) ?? null;
  }
}

function normalizeSegments(segments: WorkoutSegment[] | undefined): WorkoutSegment[] {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter((row) => row?.name?.trim())
    .map((row) => ({
      name: row.name.trim(),
      prescription: row.prescription?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
      videoUrl: row.videoUrl?.trim() || null,
    }));
}

function normalizeMetric(value: string | null | undefined, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function logKey(userId: string, workoutId: string, assignmentId: string): string {
  return `${userId}:${workoutId}:${assignmentId}`;
}

export function nextUnconfirmed(profile: OnboardingProfile): OnboardingSectionId {
  for (let i = 1; i <= 9; i += 1) {
    if (!profile.confirmedSections.includes(i as OnboardingSectionId)) {
      return i as OnboardingSectionId;
    }
  }
  return 9;
}

export function nextStep(consent: ConsentRecord | null, onboarding: OnboardingProfile | null): MePayload["next"] {
  if (!consent) return "consent";
  if (!onboarding || onboarding.confirmedSections.length < 9) return "onboarding";
  if (!onboarding.completedAt) return "summary";
  return "home";
}

export function encodeMockToken(claims: TokenClaims): string {
  return `mock.${encodeURIComponent(JSON.stringify(claims))}`;
}

export function decodeMockToken(token: string): TokenClaims {
  if (!token.startsWith("mock.")) {
    throw new AjaxStoreError("unauthorized", "Session is not valid.");
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(token.slice(5))) as TokenClaims;
    if (!parsed.sub || !parsed.email || !parsed.tenantId) {
      throw new Error("incomplete");
    }
    return parsed;
  } catch {
    throw new AjaxStoreError("unauthorized", "Session is not valid.");
  }
}

export function consentKey(_kind: ConsentKind, userId: string): string {
  return userId;
}
