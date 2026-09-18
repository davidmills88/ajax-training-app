import {
  InMemoryAjaxStore,
  type ClientSummary,
  type ConsentQuestionnaire,
  type ConsentRecord,
  type CreateBlockInput,
  type LogWorkoutInput,
  type MePayload,
  type OnboardingAnswers,
  type OnboardingProfile,
  type Program,
  type ProgramAssignment,
  type RosterEntry,
  type Session,
  type SessionUser,
  type TrainingHome,
  type Workout,
  type WorkoutDetail,
  type WorkoutLog,
} from "@ajax/shared";
import { PostgresAjaxStore } from "./postgres.js";

export type AjaxRepo = {
  tenantId: string;
  tenantSlug: string;
  findRoster(email: string): Promise<RosterEntry | undefined>;
  listRoster(): Promise<RosterEntry[]>;
  issueSession(email: string): Promise<Session>;
  userFromToken(token: string): Promise<SessionUser>;
  getMe(user: SessionUser): Promise<MePayload>;
  saveConsent(user: SessionUser, questionnaire: ConsentQuestionnaire): Promise<ConsentRecord>;
  getOnboarding(user: SessionUser): Promise<OnboardingProfile>;
  saveSection(user: SessionUser, sectionId: number, answers: OnboardingAnswers): Promise<OnboardingProfile>;
  confirmSection(user: SessionUser, sectionId: number): Promise<OnboardingProfile>;
  updateSummary(user: SessionUser, summary: ClientSummary): Promise<OnboardingProfile>;
  completeOnboarding(user: SessionUser): Promise<OnboardingProfile>;
  createBlock(actor: SessionUser, input: CreateBlockInput): Promise<Program>;
  assignBlock(actor: SessionUser, programId: string, email: string): Promise<ProgramAssignment>;
  listBlocks(actor: SessionUser): Promise<Program[]>;
  getBlock(
    actor: SessionUser,
    programId: string,
  ): Promise<{ program: Program; workouts: Workout[]; assignments: ProgramAssignment[] }>;
  getTrainingHome(user: SessionUser): Promise<TrainingHome>;
  getWorkoutDetail(user: SessionUser, workoutId: string): Promise<WorkoutDetail>;
  logWorkout(user: SessionUser, workoutId: string, input: LogWorkoutInput): Promise<WorkoutLog>;
};

export function memoryRepo(store = new InMemoryAjaxStore()): AjaxRepo {
  return {
    tenantId: store.tenantId,
    tenantSlug: store.tenantSlug,
    findRoster: async (email) => store.findRoster(email),
    listRoster: async () => store.listRoster(),
    issueSession: async (email) => store.issueSession(email),
    userFromToken: async (token) => store.userFromToken(token),
    getMe: async (user) => store.getMe(user),
    saveConsent: async (user, questionnaire) => store.saveConsent(user, questionnaire),
    getOnboarding: async (user) => store.getOnboarding(user),
    saveSection: async (user, sectionId, answers) => store.saveSection(user, sectionId, answers),
    confirmSection: async (user, sectionId) => store.confirmSection(user, sectionId),
    updateSummary: async (user, summary) => store.updateSummary(user, summary),
    completeOnboarding: async (user) => store.completeOnboarding(user),
    createBlock: async (actor, input) => store.createBlock(actor, input),
    assignBlock: async (actor, programId, email) => store.assignBlock(actor, programId, email),
    listBlocks: async (actor) => store.listBlocks(actor),
    getBlock: async (actor, programId) => store.getBlock(actor, programId),
    getTrainingHome: async (user) => store.getTrainingHome(user),
    getWorkoutDetail: async (user, workoutId) => store.getWorkoutDetail(user, workoutId),
    logWorkout: async (user, workoutId, input) => store.logWorkout(user, workoutId, input),
  };
}

export function postgresRepo(store: PostgresAjaxStore): AjaxRepo {
  return {
    tenantId: store.tenantId,
    tenantSlug: store.tenantSlug,
    findRoster: (email) => store.findRoster(email),
    listRoster: () => store.listRoster(),
    issueSession: (email) => store.issueSession(email),
    userFromToken: (token) => store.userFromToken(token),
    getMe: (user) => store.getMe(user),
    saveConsent: (user, questionnaire) => store.saveConsent(user, questionnaire),
    getOnboarding: (user) => store.getOnboarding(user),
    saveSection: (user, sectionId, answers) => store.saveSection(user, sectionId, answers),
    confirmSection: (user, sectionId) => store.confirmSection(user, sectionId),
    updateSummary: (user, summary) => store.updateSummary(user, summary),
    completeOnboarding: (user) => store.completeOnboarding(user),
    createBlock: (actor, input) => store.createBlock(actor, input),
    assignBlock: (actor, programId, email) => store.assignBlock(actor, programId, email),
    listBlocks: (actor) => store.listBlocks(actor),
    getBlock: (actor, programId) => store.getBlock(actor, programId),
    getTrainingHome: (user) => store.getTrainingHome(user),
    getWorkoutDetail: (user, workoutId) => store.getWorkoutDetail(user, workoutId),
    logWorkout: (user, workoutId, input) => store.logWorkout(user, workoutId, input),
  };
}
