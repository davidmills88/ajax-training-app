import {
  AjaxStoreError,
  AJAX_TENANT_ID,
  buildClientSummary,
  decodeMockToken,
  encodeMockToken,
  nextUnconfirmed,
  TENANT_SLUG_AJAX,
  validateConsent,
  validateSectionAnswers,
  isOnboardingSectionId,
  type ClientSummary,
  type ConsentQuestionnaire,
  type ConsentRecord,
  type MePayload,
  type OnboardingAnswers,
  type OnboardingProfile,
  type OnboardingSectionId,
  type RosterEntry,
  type Session,
  type SessionUser,
} from "@ajax/shared";
import { nextStep } from "@ajax/shared";
import pg from "pg";

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

export async function tryCreatePostgresStore(): Promise<PostgresAjaxStore | null> {
  if (!process.env.DATABASE_URL) return null;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("select 1");
    return new PostgresAjaxStore(pool);
  } catch (err) {
    console.warn("DATABASE_URL set but Postgres is unreachable; using in-memory mock.", err);
    await pool.end().catch(() => undefined);
    return null;
  }
}
