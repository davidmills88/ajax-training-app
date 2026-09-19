const TYPICAL_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/\[::1\](?::\d+)?$/i,
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/i,
  /^https:\/\/([a-z0-9-]+\.)*expo\.dev$/i,
  /^https:\/\/([a-z0-9-]+\.)*exp\.direct$/i,
  /^https:\/\/([a-z0-9-]+\.)*exp\.host$/i,
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*ajaxgym\.com$/i,
];

export function extraCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const extras = extraCorsOrigins();
  if (extras.includes("*")) return true;
  if (extras.includes(origin)) return true;
  return TYPICAL_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Hono `cors({ origin })` callback.
 * - Expo web (localhost:8081), LAN Expo, expo.dev, Vercel previews, ajaxgym.com
 * - Extra origins from CORS_ORIGINS (comma-separated). `*` allows any.
 * - Unset CORS_ORIGINS stays permissive so unknown Expo tunnels still work.
 */
export function resolveCorsOrigin(origin: string): string {
  const extras = extraCorsOrigins();
  if (extras.includes("*")) return origin || "*";
  if (!origin) return "*";
  if (isAllowedCorsOrigin(origin)) return origin;
  if (extras.length === 0) return origin;
  return "";
}
