import {
  AjaxStoreError,
  AJAX_TENANT_ID,
  buildClientSummary,
  decodeMockToken,
  encodeMockToken,
  isCoachRole,
  nextUnconfirmed,
  TENANT_SLUG_AJAX,
  validateConsent,
  validateCreateBlock,
  validateSectionAnswers,
  isOnboardingSectionId,
  type ClientSummary,
  type ConsentQuestionnaire,
  type ConsentRecord,
  type CreateBlockInput,
  type LogWorkoutInput,
  type MePayload,
  type OnboardingAnswers,
  type OnboardingProfile,
  type OnboardingSectionId,
  type Program,
  type ProgramAssignment,
  type RosterEntry,
  type Session,
  type SessionUser,
  type TrainingHome,
  type Workout,
  type WorkoutDetail,
  type WorkoutLog,
  type WorkoutSegment,
} from "@ajax/shared";
import { nextStep } from "@ajax/shared";
import pg from "pg";
import { postgresPoolSsl } from "./postgres-ssl.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class PostgresAjaxStore {
  readonly tenantId = AJAX_TENANT_ID;
  readonly tenantSlug = TENANT_SLUG_AJAX;

  constructor(private readonly pool: pg.Pool) {}

  async findRoster(email: string): Promise<RosterEntry | undefined> {
    const result = await this.pool.query<RosterEntry>(
      `select id, tenant_id as "tenantId", email, full_name as "fullName", status
       from member_roster
       where tenant_id = $1 and email = $2`,
      [this.tenantId, normalizeEmail(email)],
    );
    return result.rows[0];
  }

  async listRoster(): Promise<RosterEntry[]> {
    const result = await this.pool.query<RosterEntry>(
      `select id, tenant_id as "tenantId", email, full_name as "fullName", status
       from member_roster
       where tenant_id = $1
       order by full_name`,
      [this.tenantId],
    );
    return result.rows;
  }

  async issueSession(email: string): Promise<Session> {
    const roster = await this.findRoster(email);
    if (!roster) throw new AjaxStoreError("not_on_roster", "This email is not on the Ajax member list yet.");
    if (roster.status !== "active") throw new AjaxStoreError("inactive_roster", "This membership is not active.");

    const existing = await this.pool.query<SessionUser>(
      `select id, tenant_id as "tenantId", email, full_name as "fullName", role
       from app_users
       where tenant_id = $1 and email = $2`,
      [this.tenantId, roster.email],
    );

    let user = existing.rows[0];
    if (!user) {
      const inserted = await this.pool.query<SessionUser>(
        `insert into app_users (tenant_id, email, full_name, role)
         values ($1, $2, $3, $4)
         returning id, tenant_id as "tenantId", email, full_name as "fullName", role`,
        [this.tenantId, roster.email, roster.fullName, roster.email === "david@ajaxgym.com" ? "owner" : "member"],
      );
      user = inserted.rows[0];
    }

    return {
      accessToken: encodeMockToken({ sub: user.id, email: user.email, tenantId: user.tenantId }),
      user,
      mode: "live",
    };
  }

  userFromToken(token: string): Promise<SessionUser> {
    const claims = decodeMockToken(token);
    return this.pool
      .query<SessionUser>(
        `select id, tenant_id as "tenantId", email, full_name as "fullName", role
         from app_users
         where id = $1 and tenant_id = $2`,
        [claims.sub, claims.tenantId],
      )
      .then((result) => {
        if (!result.rows[0]) throw new AjaxStoreError("unauthorized", "Session is not valid.");
        return result.rows[0];
      });
  }

  async getMe(user: SessionUser): Promise<MePayload> {
    const [roster, consent, onboarding] = await Promise.all([
      this.findRoster(user.email),
      this.findConsent(user.id),
      this.findOnboarding(user.id),
    ]);
    return {
      user,
      roster: roster ?? null,
      consent,
      onboarding,
      next: nextStep(consent, onboarding),
    };
  }

  private async findConsent(userId: string): Promise<ConsentRecord | null> {
    const result = await this.pool.query<ConsentRecord>(
      `select id, tenant_id as "tenantId", user_id as "userId", kind,
              questionnaire, accepted_at as "acceptedAt"
       from consents
       where tenant_id = $1 and user_id = $2 and kind = 'account_privacy'`,
      [this.tenantId, userId],
    );
    return result.rows[0] ?? null;
  }

  async saveConsent(user: SessionUser, questionnaire: ConsentQuestionnaire): Promise<ConsentRecord> {
    const errors = validateConsent(questionnaire);
    if (errors.length) throw new AjaxStoreError("invalid_consent", errors.join(" "));
    const result = await this.pool.query<ConsentRecord>(
      `insert into consents (tenant_id, user_id, kind, questionnaire)
       values ($1, $2, 'account_privacy', $3)
       on conflict (tenant_id, user_id, kind)
       do update set questionnaire = excluded.questionnaire, accepted_at = now()
       returning id, tenant_id as "tenantId", user_id as "userId", kind,
                 questionnaire, accepted_at as "acceptedAt"`,
      [this.tenantId, user.id, questionnaire],
    );
    return result.rows[0];
  }

  async getOnboarding(user: SessionUser): Promise<OnboardingProfile> {
    const existing = await this.findOnboarding(user.id);
    if (existing) return existing;
    const result = await this.pool.query<OnboardingProfile>(
      `insert into onboarding_profiles (tenant_id, user_id)
       values ($1, $2)
       returning id, tenant_id as "tenantId", user_id as "userId",
                 current_section as "currentSection", sections,
                 confirmed_sections as "confirmedSections",
                 client_summary as "clientSummary", completed_at as "completedAt",
                 updated_at as "updatedAt"`,
      [this.tenantId, user.id],
    );
    return normalizeProfile(result.rows[0]);
  }

  private async findOnboarding(userId: string): Promise<OnboardingProfile | null> {
    const result = await this.pool.query<OnboardingProfile>(
      `select id, tenant_id as "tenantId", user_id as "userId",
              current_section as "currentSection", sections,
              confirmed_sections as "confirmedSections",
              client_summary as "clientSummary", completed_at as "completedAt",
              updated_at as "updatedAt"
       from onboarding_profiles
       where tenant_id = $1 and user_id = $2`,
      [this.tenantId, userId],
    );
    return result.rows[0] ? normalizeProfile(result.rows[0]) : null;
  }

  async saveSection(user: SessionUser, sectionId: number, answers: OnboardingAnswers): Promise<OnboardingProfile> {
    if (!isOnboardingSectionId(sectionId)) throw new AjaxStoreError("invalid_section", "Section must be 1–9.");
    const profile = await this.getOnboarding(user);
    const expected = nextUnconfirmed(profile);
    if (sectionId !== expected && !profile.confirmedSections.includes(sectionId)) {
      throw new AjaxStoreError("confirm_out_of_order", `Complete section ${expected} first.`);
    }
    const errors = validateSectionAnswers(sectionId, answers);
    if (errors.length) throw new AjaxStoreError("section_incomplete", errors.join(" "));
    profile.sections[sectionId] = answers;
    profile.currentSection = sectionId;
    return this.persistProfile(profile);
  }

  async confirmSection(user: SessionUser, sectionId: number): Promise<OnboardingProfile> {
    if (!isOnboardingSectionId(sectionId)) throw new AjaxStoreError("invalid_section", "Section must be 1–9.");
    const profile = await this.getOnboarding(user);
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
    profile.currentSection = nextUnconfirmed(profile);
    if (profile.confirmedSections.length === 9) {
      profile.clientSummary = buildClientSummary(profile.sections);
    }
    return this.persistProfile(profile);
  }

  async updateSummary(user: SessionUser, summary: ClientSummary): Promise<OnboardingProfile> {
    const profile = await this.getOnboarding(user);
    if (profile.confirmedSections.length < 9) {
      throw new AjaxStoreError("section_incomplete", "Confirm all nine sections before editing the client summary.");
    }
    profile.clientSummary = summary;
    return this.persistProfile(profile);
  }

  async completeOnboarding(user: SessionUser): Promise<OnboardingProfile> {
    const profile = await this.getOnboarding(user);
    if (profile.confirmedSections.length < 9) {
      throw new AjaxStoreError("section_incomplete", "Confirm all nine sections first.");
    }
    if (!profile.clientSummary) profile.clientSummary = buildClientSummary(profile.sections);
    profile.completedAt = new Date().toISOString();
    return this.persistProfile(profile);
  }

  async createBlock(actor: SessionUser, input: CreateBlockInput): Promise<Program> {
    assertCoach(actor);
    const errors = validateCreateBlock(input);
    if (errors.length) throw new AjaxStoreError("invalid_block", errors.join(" "));
    const durationWeeks = input.durationWeeks ?? 6;
    const inserted = await this.pool.query<Program>(
      `insert into programs (tenant_id, title, notes, duration_weeks)
       values ($1, $2, $3, $4)
       returning id, tenant_id as "tenantId", title, notes,
                 duration_weeks as "durationWeeks", created_at as "createdAt"`,
      [this.tenantId, input.title.trim(), input.notes?.trim() ?? "", durationWeeks],
    );
    const program = inserted.rows[0];
    for (const [index, row] of input.workouts.entries()) {
      await this.pool.query(
        `insert into workouts (tenant_id, program_id, week, day, sort_order, title, notes, video_url, segments)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          this.tenantId,
          program.id,
          row.week,
          row.day,
          row.sortOrder ?? index,
          row.title.trim(),
          row.notes?.trim() ?? "",
          row.videoUrl?.trim() || null,
          JSON.stringify(normalizeSegments(row.segments)),
        ],
      );
    }
    return program;
  }

  async assignBlock(actor: SessionUser, programId: string, email: string): Promise<ProgramAssignment> {
    assertCoach(actor);
    const program = await this.findProgram(programId);
    if (!program) throw new AjaxStoreError("not_found", "That block does not exist.");
    const roster = await this.findRoster(email);
    if (!roster) throw new AjaxStoreError("not_on_roster", "This email is not on the Ajax member list yet.");
    if (roster.status !== "active") throw new AjaxStoreError("inactive_roster", "This membership is not active.");

    await this.pool.query(
      `update program_assignments
       set status = 'inactive'
       where tenant_id = $1 and member_email = $2 and status = 'active'`,
      [this.tenantId, roster.email],
    );

    const existingUser = await this.pool.query<{ id: string }>(
      `select id from app_users where tenant_id = $1 and email = $2`,
      [this.tenantId, roster.email],
    );

    const inserted = await this.pool.query<ProgramAssignment>(
      `insert into program_assignments (tenant_id, program_id, member_email, user_id, status)
       values ($1, $2, $3, $4, 'active')
       returning id, tenant_id as "tenantId", program_id as "programId",
                 member_email as "memberEmail", user_id as "userId",
                 status, assigned_at as "assignedAt"`,
      [this.tenantId, program.id, roster.email, existingUser.rows[0]?.id ?? null],
    );
    return inserted.rows[0];
  }

  async listBlocks(actor: SessionUser): Promise<Program[]> {
    assertCoach(actor);
    const result = await this.pool.query<Program>(
      `select id, tenant_id as "tenantId", title, notes,
              duration_weeks as "durationWeeks", created_at as "createdAt"
       from programs
       where tenant_id = $1
       order by created_at`,
      [this.tenantId],
    );
    return result.rows;
  }

  async getBlock(
    actor: SessionUser,
    programId: string,
  ): Promise<{ program: Program; workouts: Workout[]; assignments: ProgramAssignment[] }> {
    assertCoach(actor);
    const program = await this.findProgram(programId);
    if (!program) throw new AjaxStoreError("not_found", "That block does not exist.");
    const [workouts, assignments] = await Promise.all([
      this.workoutsForProgram(program.id),
      this.assignmentsForProgram(program.id),
    ]);
    return { program, workouts, assignments };
  }

  async getTrainingHome(user: SessionUser): Promise<TrainingHome> {
    const assignment = await this.activeAssignmentFor(user.email);
    if (!assignment) return { assignment: null, program: null, workouts: [] };
    if (assignment.userId !== user.id) {
      await this.pool.query(
        `update program_assignments set user_id = $3 where id = $1 and tenant_id = $2`,
        [assignment.id, this.tenantId, user.id],
      );
      assignment.userId = user.id;
    }
    const program = (await this.findProgram(assignment.programId)) ?? null;
    const workouts = await this.workoutsForProgram(assignment.programId);
    const logs = await this.logsForAssignment(user.id, assignment.id);
    return {
      assignment,
      program,
      workouts: workouts.map((workout) => ({ ...workout, log: logs.get(workout.id) ?? null })),
    };
  }

  async getWorkoutDetail(user: SessionUser, workoutId: string): Promise<WorkoutDetail> {
    const home = await this.getTrainingHome(user);
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

  async logWorkout(user: SessionUser, workoutId: string, input: LogWorkoutInput): Promise<WorkoutLog> {
    const detail = await this.getWorkoutDetail(user, workoutId);
    const existing = detail.log;
    let completedAt = existing?.completedAt ?? null;
    if (input.completed === true) completedAt = new Date().toISOString();
    if (input.completed === false) completedAt = null;
    const weight = normalizeMetric(input.weight, existing?.weight ?? null);
    const reps = normalizeMetric(input.reps, existing?.reps ?? null);
    const score = normalizeMetric(input.score, existing?.score ?? null);
    const notes = input.notes !== undefined ? String(input.notes) : existing?.notes ?? "";

    const result = await this.pool.query<WorkoutLog>(
      `insert into workout_logs (
         tenant_id, user_id, workout_id, assignment_id, weight, reps, score, notes, completed_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (tenant_id, user_id, workout_id, assignment_id)
       do update set
         weight = excluded.weight,
         reps = excluded.reps,
         score = excluded.score,
         notes = excluded.notes,
         completed_at = excluded.completed_at
       returning id, tenant_id as "tenantId", user_id as "userId",
                 workout_id as "workoutId", assignment_id as "assignmentId",
                 weight, reps, score, notes,
                 completed_at as "completedAt", created_at as "createdAt"`,
      [this.tenantId, user.id, workoutId, detail.assignment.id, weight, reps, score, notes, completedAt],
    );
    return result.rows[0];
  }

  private async findProgram(programId: string): Promise<Program | undefined> {
    const result = await this.pool.query<Program>(
      `select id, tenant_id as "tenantId", title, notes,
              duration_weeks as "durationWeeks", created_at as "createdAt"
       from programs
       where tenant_id = $1 and id = $2`,
      [this.tenantId, programId],
    );
    return result.rows[0];
  }

  private async workoutsForProgram(programId: string): Promise<Workout[]> {
    const result = await this.pool.query<Workout>(
      `select id, tenant_id as "tenantId", program_id as "programId",
              week, day, sort_order as "sortOrder", title, notes,
              video_url as "videoUrl", segments
       from workouts
       where tenant_id = $1 and program_id = $2
       order by week, day, sort_order`,
      [this.tenantId, programId],
    );
    return result.rows.map((row) => ({ ...row, segments: Array.isArray(row.segments) ? row.segments : [] }));
  }

  private async assignmentsForProgram(programId: string): Promise<ProgramAssignment[]> {
    const result = await this.pool.query<ProgramAssignment>(
      `select id, tenant_id as "tenantId", program_id as "programId",
              member_email as "memberEmail", user_id as "userId",
              status, assigned_at as "assignedAt"
       from program_assignments
       where tenant_id = $1 and program_id = $2
       order by assigned_at`,
      [this.tenantId, programId],
    );
    return result.rows;
  }

  private async activeAssignmentFor(email: string): Promise<ProgramAssignment | undefined> {
    const result = await this.pool.query<ProgramAssignment>(
      `select id, tenant_id as "tenantId", program_id as "programId",
              member_email as "memberEmail", user_id as "userId",
              status, assigned_at as "assignedAt"
       from program_assignments
       where tenant_id = $1 and member_email = $2 and status = 'active'
       order by assigned_at desc
       limit 1`,
      [this.tenantId, normalizeEmail(email)],
    );
    return result.rows[0];
  }

  private async logsForAssignment(userId: string, assignmentId: string): Promise<Map<string, WorkoutLog>> {
    const result = await this.pool.query<WorkoutLog>(
      `select id, tenant_id as "tenantId", user_id as "userId",
              workout_id as "workoutId", assignment_id as "assignmentId",
              weight, reps, score, notes,
              completed_at as "completedAt", created_at as "createdAt"
       from workout_logs
       where tenant_id = $1 and user_id = $2 and assignment_id = $3`,
      [this.tenantId, userId, assignmentId],
    );
    return new Map(result.rows.map((row) => [row.workoutId, row]));
  }

  private async persistProfile(profile: OnboardingProfile): Promise<OnboardingProfile> {
    const result = await this.pool.query<OnboardingProfile>(
      `update onboarding_profiles
       set current_section = $3,
           sections = $4,
           confirmed_sections = $5,
           client_summary = $6,
           completed_at = $7,
           updated_at = now()
       where id = $1 and tenant_id = $2
       returning id, tenant_id as "tenantId", user_id as "userId",
                 current_section as "currentSection", sections,
                 confirmed_sections as "confirmedSections",
                 client_summary as "clientSummary", completed_at as "completedAt",
                 updated_at as "updatedAt"`,
      [
        profile.id,
        this.tenantId,
        profile.currentSection,
        profile.sections,
        profile.confirmedSections,
        profile.clientSummary,
        profile.completedAt,
      ],
    );
    return normalizeProfile(result.rows[0]);
  }
}

function normalizeProfile(row: OnboardingProfile): OnboardingProfile {
  return {
    ...row,
    currentSection: Number(row.currentSection) as OnboardingSectionId,
    confirmedSections: (row.confirmedSections ?? []).map(Number) as OnboardingSectionId[],
    sections: row.sections ?? {},
  };
}

function assertCoach(actor: SessionUser) {
  if (!isCoachRole(actor.role)) {
    throw new AjaxStoreError("forbidden", "Only a coach or owner can create and assign blocks.");
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

export async function tryCreatePostgresStore(): Promise<PostgresAjaxStore | null> {
  if (!process.env.DATABASE_URL) return null;
  const connectionString = process.env.DATABASE_URL;
  const serverless = Boolean(process.env.VERCEL);
  const max = Number.parseInt(process.env.PG_POOL_MAX ?? (serverless ? "1" : "10"), 10);
  const pool = new pg.Pool({
    connectionString,
    ssl: postgresPoolSsl(connectionString),
    max: Number.isFinite(max) && max > 0 ? max : serverless ? 1 : 10,
  });
  try {
    await pool.query("select 1");
    return new PostgresAjaxStore(pool);
  } catch (err) {
    console.warn("DATABASE_URL set but Postgres is unreachable; using in-memory mock.", err);
    await pool.end().catch(() => undefined);
    return null;
  }
}
