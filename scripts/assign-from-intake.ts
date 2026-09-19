#!/usr/bin/env npx tsx
/**
 * Map Dave / Client Summary intake → POST /coach/assign-from-intake (create + assign).
 *
 *   npm run assign:from-intake
 *   npm run assign:from-intake -- --file fixtures/sample-intake.json --email member@ajax.local
 *   npm run assign:from-intake -- --print-block
 *   npm run assign:from-intake -- --skeleton --print-block
 *   npm run assign:from-intake -- --run --email member@ajax.local
 *
 * Live Auth: set COACH_API_KEY on the API and here. GET /training verify is
 * best-effort — otp_failed does not fail --run after a successful assign.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blockFromIntake,
  magicLinkVerifySkipReason,
  resolveIntakeEmail,
  type DaveIntake,
} from "../packages/shared/src/intake.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = resolve(ROOT, "fixtures/sample-intake.json");

type Args = {
  run: boolean;
  printBlock: boolean;
  skeleton: boolean;
  file: string;
  email: string | undefined;
  baseUrl: string;
  coachEmail: string;
};

function usage(): string {
  return `Usage: assign-from-intake [--print|--run|--print-block] [--skeleton] [--file PATH] [--email EMAIL] [--base-url URL]

  --print         Print the Dave curl (default). Does not call the API.
  --run           POST /coach/assign-from-intake, then optional GET /training.
  --print-block   Print the mapped POST /coach/blocks JSON only.
  --skeleton      Use the M1.2 DEMO_BLOCK overlay instead of the M2 generator.
  --file          Intake JSON (default: fixtures/sample-intake.json)
  --email         Roster email to assign (default: intake.email or member@ajax.local)
  --base-url      API origin (default: $AJAX_API_URL or http://localhost:8787)

Auth: if $COACH_API_KEY is set, requests send X-Coach-Key. Otherwise --run
signs in as $AJAX_COACH_EMAIL via POST /auth/magic-link (mock mode only).

GET /training after assign is optional. Live otp_failed exits 0 with a warning.`;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: false,
    printBlock: false,
    skeleton: false,
    file: process.env.AJAX_INTAKE_FILE || DEFAULT_FILE,
    email: process.env.AJAX_ASSIGN_EMAIL,
    baseUrl: process.env.AJAX_API_URL || "http://localhost:8787",
    coachEmail: process.env.AJAX_COACH_EMAIL || "david@ajaxgym.com",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--print") args.run = false;
    else if (arg === "--run") args.run = true;
    else if (arg === "--print-block") args.printBlock = true;
    else if (arg === "--skeleton") args.skeleton = true;
    else if (arg === "--file" || arg === "--intake") {
      args.file = argv[++i] ?? "";
    } else if (arg === "--email") {
      args.email = argv[++i];
    } else if (arg === "--base-url") {
      args.baseUrl = argv[++i] ?? args.baseUrl;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}\n\n${usage()}`);
      process.exit(1);
    }
  }
  if (!args.file) {
    console.error("Missing --file path.");
    process.exit(1);
  }
  return args;
}

function loadIntake(file: string): DaveIntake {
  const path = resolve(file);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as DaveIntake;
}

function coachHeadersPrint(): string {
  if (process.env.COACH_API_KEY) {
    return "  -H 'X-Coach-Key: $COACH_API_KEY' \\";
  }
  return '  -H "Authorization: Bearer $TOKEN" \\';
}

function printFlow(args: Args, file: string, email: string): void {
  const base = args.baseUrl.replace(/\/$/, "");
  const lines: string[] = [
    "# Dave Client Summary → create + assign (no David, no SMS/email)",
    `# Intake:  ${file}`,
    `# API:     ${base}`,
    `# Member:  ${email}`,
    "",
    "# Preferred: one POST after Client Summary is ready.",
  ];
  if (!process.env.COACH_API_KEY) {
    lines.push(
      "# Mock owner session (skip if COACH_API_KEY is set on the API)",
      `TOKEN=$(curl -sS ${base}/auth/magic-link \\`,
      "  -H 'Content-Type: application/json' \\",
      `  -d '{"email":"${args.coachEmail}"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")`,
      "",
    );
  } else {
    lines.push("# Auth: X-Coach-Key from $COACH_API_KEY", "");
  }
  lines.push(
    args.skeleton
      ? "# Nested body if the file has no email, or to pass --skeleton"
      : "# Flat sample-intake.json already includes email. Override with --email via jq:",
    `curl -sS ${base}/coach/assign-from-intake \\`,
    coachHeadersPrint(),
    "  -H 'Content-Type: application/json' \\",
    email && !args.skeleton
      ? `  --data-binary @<(jq --arg email '${email}' '. + {email: $email}' ${file})`
      : `  --data-binary @<(jq --arg email '${email}' --argjson skeleton ${args.skeleton ? "true" : "false"} '{email: $email, skeleton: $skeleton, intake: .}' ${file})`,
    "",
    "# Equivalent: npm run assign:from-intake -- --run --email " + email + " --file " + file,
    "",
    "# GET /training: mint a member session (live magic-link has no session / is often rate-limited)",
  );
  if (process.env.COACH_API_KEY) {
    lines.push(
      `MEMBER=$(curl -sS ${base}/auth/coach-session \\`,
      "  -H 'Content-Type: application/json' \\",
      "  -H 'X-Coach-Key: $COACH_API_KEY' \\",
      `  -d '{"email":"${email}"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")`,
    );
  } else {
    lines.push(
      `MEMBER=$(curl -sS ${base}/auth/magic-link \\`,
      "  -H 'Content-Type: application/json' \\",
      `  -d '{"email":"${email}"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")`,
    );
  }
  lines.push(`curl -sS ${base}/training -H "Authorization: Bearer $MEMBER"`);
  console.log(lines.join("\n"));
}

async function readJsonResponse(response: Response): Promise<{ status: number; text: string; parsed: unknown }> {
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: response.status, text, parsed };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Expected object, got: ${JSON.stringify(value)}`);
}

async function jsonRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<unknown> {
  const response = await fetch(url, init);
  const { status, text, parsed } = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} → ${status}: ${text}`);
  }
  return parsed;
}

async function coachHeaders(args: Args, base: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const coachKey = process.env.COACH_API_KEY;
  if (coachKey) {
    headers["X-Coach-Key"] = coachKey;
    console.error("Auth: X-Coach-Key");
    return headers;
  }
  console.error(`Signing in as ${args.coachEmail} (mock magic-link)…`);
  const login = asRecord(
    await jsonRequest(`${base}/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: args.coachEmail }),
    }),
  );
  const session = asRecord(login.session);
  headers.Authorization = `Bearer ${String(session.accessToken)}`;
  return headers;
}

async function createAndAssignFallback(
  base: string,
  headers: Record<string, string>,
  block: ReturnType<typeof blockFromIntake>,
  email: string,
): Promise<unknown> {
  console.error(`Creating block "${block.title}" from intake…`);
  const created = asRecord(
    await jsonRequest(`${base}/coach/blocks`, {
      method: "POST",
      headers,
      body: JSON.stringify(block),
    }),
  );
  const program = asRecord(created.program);
  const workouts = created.workouts;
  const count = Array.isArray(workouts) ? workouts.length : 0;
  console.error(`Created ${String(program.title)} (${String(program.id)}) with ${count} sessions.`);

  console.error(`Assigning to ${email}…`);
  return jsonRequest(`${base}/coach/blocks/${String(program.id)}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
}

async function verifyMemberTraining(base: string, email: string): Promise<{ skipped: boolean }> {
  console.error(`Verifying GET /training as ${email} (best-effort)…`);
  const coachKey = process.env.COACH_API_KEY;
  if (coachKey) {
    const mintedResponse = await fetch(`${base}/auth/coach-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coach-Key": coachKey },
      body: JSON.stringify({ email }),
    });
    const minted = await readJsonResponse(mintedResponse);
    if (mintedResponse.ok) {
      const session = asRecord(asRecord(minted.parsed).session);
      return finishMemberTraining(base, session);
    }
    if (mintedResponse.status !== 404) {
      throw new Error(`POST ${base}/auth/coach-session → ${minted.status}: ${minted.text}`);
    }
    console.error("POST /auth/coach-session not deployed; falling back to magic-link verify.");
  }

  const loginResponse = await fetch(`${base}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const login = await readJsonResponse(loginResponse);
  const skip = magicLinkVerifySkipReason(login.status, login.parsed);
  if (skip) {
    console.error(`Warning: ${skip}`);
    return { skipped: true };
  }
  if (!loginResponse.ok) {
    throw new Error(`POST ${base}/auth/magic-link → ${login.status}: ${login.text}`);
  }
  const session = asRecord(asRecord(login.parsed).session);
  return finishMemberTraining(base, session);
}

async function finishMemberTraining(base: string, session: Record<string, unknown>): Promise<{ skipped: boolean }> {
  const training = asRecord(
    await jsonRequest(`${base}/training`, {
      headers: { Authorization: `Bearer ${String(session.accessToken)}` },
    }),
  );
  const trainingProgram = asRecord(training.program);
  const trainingWorkouts = Array.isArray(training.workouts) ? training.workouts : [];
  console.error(
    `Member home: ${String(trainingProgram.title)} · ${trainingWorkouts.length} sessions · assignment ${asRecord(training.assignment).status}`,
  );
  console.log(
    JSON.stringify(
      { program: training.program, assignment: training.assignment, workoutCount: trainingWorkouts.length },
      null,
      2,
    ),
  );
  return { skipped: false };
}

async function runFlow(args: Args, intake: DaveIntake, email: string): Promise<void> {
  const base = args.baseUrl.replace(/\/$/, "");
  const headers = await coachHeaders(args, base);
  const payload = { email, skeleton: args.skeleton, intake };

  console.error(`POST /coach/assign-from-intake as ${email}…`);
  const response = await fetch(`${base}/coach/assign-from-intake`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const result = await readJsonResponse(response);

  if (response.status === 404) {
    console.error("POST /coach/assign-from-intake not deployed; falling back to create + assign.");
    const assigned = await createAndAssignFallback(base, headers, blockFromIntake(intake, { skeleton: args.skeleton }), email);
    console.log(JSON.stringify(assigned, null, 2));
  } else if (!response.ok) {
    throw new Error(`POST ${base}/coach/assign-from-intake → ${result.status}: ${result.text}`);
  } else {
    const assigned = asRecord(result.parsed);
    const program = asRecord(assigned.program);
    const workouts = assigned.workouts;
    const count = Array.isArray(workouts) ? workouts.length : 0;
    console.error(`Assigned ${String(program.title)} (${String(program.id)}) · ${count} sessions.`);
    console.log(JSON.stringify(assigned, null, 2));
  }

  await verifyMemberTraining(base, email);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const file = resolve(args.file);
  const intake = loadIntake(file);
  const email = args.email?.trim() || resolveIntakeEmail(intake) || "member@ajax.local";
  const block = blockFromIntake(intake, { skeleton: args.skeleton });

  if (args.printBlock) {
    console.log(JSON.stringify(block, null, 2));
    return;
  }
  if (args.run) {
    await runFlow(args, intake, email);
    return;
  }
  printFlow(args, file, email);
}

void main();
