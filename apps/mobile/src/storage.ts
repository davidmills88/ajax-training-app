const KEY = "ajax.session";

export function readSessionToken(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(KEY);
    }
  } catch {
    /* private mode */
  }
  return null;
}

export function writeSessionToken(token: string | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
