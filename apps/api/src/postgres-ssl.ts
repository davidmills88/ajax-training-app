/**
 * Supabase (including the pooler) presents a cert Node does not always trust.
 * Enable TLS without NODE_TLS_REJECT_UNAUTHORIZED=0.
 *
 * Override:
 *   DATABASE_SSL=1|true|require  → { rejectUnauthorized: false }
 *   DATABASE_SSL=0|false|disable → no ssl object (local Postgres)
 */
export function postgresPoolSsl(
  connectionString: string,
): { rejectUnauthorized: false } | undefined {
  const explicit = (process.env.DATABASE_SSL ?? process.env.PGSSL ?? "").trim().toLowerCase();
  if (explicit === "0" || explicit === "false" || explicit === "disable") return undefined;
  if (explicit === "1" || explicit === "true" || explicit === "require") {
    return { rejectUnauthorized: false };
  }

  let host = "";
  try {
    host = new URL(connectionString).hostname.toLowerCase();
  } catch {
    host = connectionString.toLowerCase();
  }

  if (
    host.endsWith(".supabase.co") ||
    host.endsWith(".supabase.com") ||
    host.includes("pooler.supabase")
  ) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}
