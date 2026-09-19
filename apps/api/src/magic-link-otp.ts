export type MagicLinkOtpFailure = {
  error: "otp_rate_limited" | "otp_failed";
  message: string;
  status: 429 | 502;
};

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

/** Map a failed Supabase OTP response to a public JSON error (no secrets). */
export function magicLinkOtpFailure(status: number, body: unknown): MagicLinkOtpFailure {
  const rec = asRecord(body);
  const tokens = [rec.error_code, rec.error, rec.code, rec.msg, rec.message]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
  const rateLimited =
    status === 429 ||
    tokens.includes("over_email_send_rate_limit") ||
    tokens.includes("rate_limit") ||
    tokens.includes("rate limit");

  if (rateLimited) {
    return {
      error: "otp_rate_limited",
      message:
        "Email sign-in is rate-limited right now. Try again later, or ask a coach to mint a demo session.",
      status: 429,
    };
  }

  return {
    error: "otp_failed",
    message: "Could not send the magic link. Ask a coach to mint a demo session if email sign-in stays down.",
    status: 502,
  };
}
