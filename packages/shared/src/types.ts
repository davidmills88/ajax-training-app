export const TENANT_SLUG_AJAX = "ajax";
export const AJAX_TENANT_ID = "11111111-1111-1111-1111-111111111111";

export type UserRole = "member" | "auditor" | "owner";
export type RosterStatus = "active" | "inactive";
export type ConsentKind = "account_privacy";
export type AuthMode = "mock" | "live";

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type Session = {
  accessToken: string;
  user: SessionUser;
  mode: AuthMode;
};

export type RosterEntry = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  status: RosterStatus;
};

export type ConsentQuestionnaire = {
  isAdult: boolean;
  understandProfileStorage: boolean;
  acceptTerms: boolean;
  understandLaterConsents: boolean;
  hearAboutUs: string;
  notes: string;
};

export type ConsentRecord = {
  id: string;
  tenantId: string;
  userId: string;
  kind: ConsentKind;
  questionnaire: ConsentQuestionnaire;
  acceptedAt: string;
};

export type OnboardingSectionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type OnboardingAnswers = Record<string, string | number | boolean | string[]>;

export type ClientSummary = {
  name: string;
  ageGender: string;
  goals: string;
  trainingAvailability: string;
  equipmentAccess: string;
  limitationsInjuries: string;
  strengthsWeaknesses: string;
  recoveryNutritionNotes: string;
  coachingPreferences: string;
};

export type OnboardingProfile = {
  id: string;
  tenantId: string;
  userId: string;
  currentSection: OnboardingSectionId;
  sections: Partial<Record<OnboardingSectionId, OnboardingAnswers>>;
  confirmedSections: OnboardingSectionId[];
  clientSummary: ClientSummary | null;
  completedAt: string | null;
  updatedAt: string;
};

export type MePayload = {
  user: SessionUser;
  roster: RosterEntry | null;
  consent: ConsentRecord | null;
  onboarding: OnboardingProfile | null;
  next: "consent" | "onboarding" | "summary" | "home";
};
