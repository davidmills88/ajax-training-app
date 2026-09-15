export type RuntimeMode = "mock" | "live";

export function runtimeMode(): RuntimeMode {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return hasDb || hasSupabase ? "live" : "mock";
}

export function port(): number {
  const raw = process.env.PORT ?? "8787";
  return Number.parseInt(raw, 10);
}
