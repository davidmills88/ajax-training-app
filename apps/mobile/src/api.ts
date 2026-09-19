import {
  AjaxStoreError,
  CONSENT_COPY,
  emptyConsentQuestionnaire,
  InMemoryAjaxStore,
  ONBOARDING_SECTIONS,
  recapSection,
  type ClientSummary,
  type ConsentQuestionnaire,
  type CreateBlockInput,
  type LogWorkoutInput,
  type MePayload,
  type OnboardingAnswers,
  type OnboardingProfile,
  type Session,
  type TrainingHome,
  type WorkoutDetail,
  type WorkoutLog,
} from "@ajax/shared";
import Constants from "expo-constants";

type Extra = {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  useMock?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:8787").replace(/\/$/, "");
const useMockFlag = process.env.EXPO_PUBLIC_USE_MOCK ?? extra.useMock ?? "1";
const FORCE_MOCK = useMockFlag === "1";

const local = new InMemoryAjaxStore();
let localUserToken: string | null = null;
let usingFallback = FORCE_MOCK;

export function isMockFallback(): boolean {
  return usingFallback;
}

export function apiBaseUrl(): string {
  return API_URL;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  if (usingFallback) {
    return localHandle<T>(path, init, token);
  }
  try {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_URL}${path}`, { ...init, headers });
    const body = (await response.json().catch(() => ({}))) as T & { message?: string; error?: string };
    if (!response.ok) {
      throw new AjaxStoreError((body.error as never) ?? "unauthorized", body.message ?? "Request failed");
    }
    return body;
  } catch (err) {
    if (err instanceof AjaxStoreError) throw err;
    usingFallback = true;
    return localHandle<T>(path, init, token);
  }
}

async function localHandle<T>(path: string, init: RequestInit, token?: string | null): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const authToken = token ?? localUserToken;

  if (path === "/health" && method === "GET") {
    return { ok: true, service: "ajax-api", mode: "mock", tenant: "ajax", fallback: true } as T;
  }
  if (path === "/meta" && method === "GET") {
    return {
      mode: "mock",
      tenant: { id: local.tenantId, slug: local.tenantSlug, name: "Ajax Fitness" },
      appleSignIn: "stubbed",
      consent: CONSENT_COPY,
    } as T;
  }
  if (path.startsWith("/roster/check") && method === "GET") {
    const email = new URL(`http://local${path}`).searchParams.get("email") ?? "";
    const entry = local.findRoster(email);
    return { allowed: Boolean(entry && entry.status === "active"), tenant: local.tenantSlug } as T;
  }
  if (path === "/auth/magic-link" && method === "POST") {
    const session = local.issueSession(String(body.email ?? ""));
    localUserToken = session.accessToken;
    return { sent: true, mock: true, message: "Mock mode: signed in locally.", session } as T;
  }
  if (path === "/auth/apple" && method === "POST") {
    throw new AjaxStoreError("not_found", "Apple Sign-In is stubbed for a later milestone.");
  }
  if (!authToken) throw new AjaxStoreError("unauthorized", "Sign in to continue.");
  const user = local.userFromToken(authToken);

  if (path === "/me") return local.getMe(user) as T;
  if (path === "/consent" && method === "POST") {
    const consent = local.saveConsent(user, body.questionnaire as ConsentQuestionnaire);
    return { consent, me: local.getMe(user) } as T;
  }
  if (path === "/onboarding" && method === "GET") {
    const profile = local.getOnboarding(user);
    return {
      profile,
      sections: ONBOARDING_SECTIONS,
      recap: recapSection(profile.currentSection, profile.sections[profile.currentSection] ?? {}),
    } as T;
  }
  const sectionMatch = path.match(/^\/onboarding\/sections\/(\d+)$/);
  if (sectionMatch && method === "PUT") {
    const id = Number(sectionMatch[1]);
    const profile = local.saveSection(user, id, (body.answers ?? {}) as OnboardingAnswers);
    return { profile, recap: recapSection(id as 1, profile.sections[id as 1] ?? {}) } as T;
  }
  const confirmMatch = path.match(/^\/onboarding\/sections\/(\d+)\/confirm$/);
  if (confirmMatch && method === "POST") {
    const profile = local.confirmSection(user, Number(confirmMatch[1]));
    return { profile, me: local.getMe(user) } as T;
  }
  if (path === "/onboarding/summary" && method === "GET") {
    const profile = local.getOnboarding(user);
    return { summary: profile.clientSummary, profile } as T;
  }
  if (path === "/onboarding/summary" && method === "PUT") {
    const profile = local.updateSummary(user, body.summary as ClientSummary);
    return { summary: profile.clientSummary, profile } as T;
  }
  if (path === "/onboarding/complete" && method === "POST") {
    const profile = local.completeOnboarding(user);
    return { profile, me: local.getMe(user) } as T;
  }
  if ((path === "/training" || path === "/training/workouts") && method === "GET") {
    return local.getTrainingHome(user) as T;
  }
  const workoutMatch = path.match(/^\/training\/workouts\/([^/]+)$/);
  if (workoutMatch && method === "GET") {
    return local.getWorkoutDetail(user, decodeURIComponent(workoutMatch[1])) as T;
  }
  const logMatch = path.match(/^\/training\/workouts\/([^/]+)\/log$/);
  if (logMatch && method === "POST") {
    const log = local.logWorkout(user, decodeURIComponent(logMatch[1]), body as LogWorkoutInput);
    return { log, workout: local.getWorkoutDetail(user, decodeURIComponent(logMatch[1])) } as T;
  }
  if (path === "/coach/blocks" && method === "GET") {
    return { blocks: local.listBlocks(user) } as T;
  }
  if (path === "/coach/blocks" && method === "POST") {
    const program = local.createBlock(user, body as CreateBlockInput);
    const detail = local.getBlock(user, program.id);
    return { program: detail.program, workouts: detail.workouts } as T;
  }
  const assignMatch = path.match(/^\/coach\/blocks\/([^/]+)\/assign$/);
  if (assignMatch && method === "POST") {
    const assignment = local.assignBlock(user, decodeURIComponent(assignMatch[1]), String(body.email ?? ""));
    return { assignment } as T;
  }
  throw new AjaxStoreError("not_found", `Unknown local path ${method} ${path}`);
}

export async function sendMagicLink(email: string): Promise<{ session?: Session; message: string }> {
  return request("/auth/magic-link", { method: "POST", body: JSON.stringify({ email }) });
}

export async function fetchMe(token: string): Promise<MePayload> {
  return request("/me", {}, token);
}

export async function submitConsent(token: string, questionnaire: ConsentQuestionnaire) {
  return request<{ me: MePayload }>("/consent", { method: "POST", body: JSON.stringify({ questionnaire }) }, token);
}

export async function saveSection(token: string, id: number, answers: OnboardingAnswers) {
  return request<{ profile: OnboardingProfile; recap: string[] }>(
    `/onboarding/sections/${id}`,
    { method: "PUT", body: JSON.stringify({ answers }) },
    token,
  );
}

export async function confirmSection(token: string, id: number) {
  return request<{ me: MePayload }>(`/onboarding/sections/${id}/confirm`, { method: "POST" }, token);
}

export async function saveSummary(token: string, summary: ClientSummary) {
  return request<{ profile: OnboardingProfile }>("/onboarding/summary", { method: "PUT", body: JSON.stringify({ summary }) }, token);
}

export async function completeOnboarding(token: string) {
  return request<{ me: MePayload }>("/onboarding/complete", { method: "POST" }, token);
}

export async function fetchTraining(token: string): Promise<TrainingHome> {
  return request("/training", {}, token);
}

export async function fetchWorkout(token: string, workoutId: string): Promise<WorkoutDetail> {
  return request(`/training/workouts/${encodeURIComponent(workoutId)}`, {}, token);
}

export async function logWorkoutResult(token: string, workoutId: string, input: LogWorkoutInput) {
  return request<{ log: WorkoutLog; workout: WorkoutDetail }>(
    `/training/workouts/${encodeURIComponent(workoutId)}/log`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export { CONSENT_COPY, emptyConsentQuestionnaire, ONBOARDING_SECTIONS };
