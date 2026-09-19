#!/usr/bin/env npx tsx
/**
 * Map Dave / Client Summary intake → POST /coach/blocks, then print or run assign.
 *
 *   npm run assign:from-intake
 *   npm run assign:from-intake -- --file fixtures/sample-intake.json --email member@ajax.local
 *   npm run assign:from-intake -- --print-block
 *   npm run assign:from-intake -- --run --email member@ajax.local
 *
 * Live Auth: set COACH_API_KEY on the API and here. Mock magic-link sessions
 * are not returned when the API is in live Auth mode.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blockFromIntake,
  resolveIntakeEmail,
  type DaveIntake,
} from "../packages/shared/src/intake.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = resolve(ROOT, "fixtures/sample-intake.json");

type Args = {
  run: boolean;
  printBlock: boolean;
  file: string;
  email: string | undefined;
  baseUrl: string;
  coachEmail: string;
};

function usage(): string {
  return `Usage: assign-from-intake [--print|--run|--print-block] [--file PATH] [--email EMAIL] [--base-url URL]

  --print         Print the curl flow (default). Does not call the API.
  --run           Map intake, POST /coach/blocks, assign, then GET /training.
  --print-block   Print the mapped POST /coach/blocks JSON only.
  --file          Intake JSON (default: fixtures/sample-intake.json)
  --email         Roster email to assign (default: intake.email or member@ajax.local)
  --base-url      API origin (default: $AJAX_API_URL or http://localhost:8787)

Auth: if $COACH_API_KEY is set, requests send X-Coach-Key. Otherwise --run
signs in as $AJAX_COACH_EMAIL via POST /auth/magic-link (mock mode only).`;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: false,
    printBlock: false,
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
    "# Dave intake → create + assign + verify",
    `# Intake:  ${file}`,
    `# API:     ${base}`,
    `# Member:  ${email}`,
    "",
  ];
  if (!process.env.COACH_API_KEY) {
    lines.push(
      "# 1. Mock owner session (skip if COACH_API_KEY is set on the API)",
      `TOKEN=$(curl -sS ${base}/auth/magic-link \\`,
      "  -H 'Content-Type: application/json' \\",
      `  -d '{"email":"${args.coachEmail}"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")`,
      "",
    );
  } else {
    lines.push("# Auth: X-Coach-Key from $COACH_API_KEY", "");
  }
  lines.push(
    "# 2. Map intake → POST /coach/blocks body, then create",
    `#    npm run assign:from-intake -- --print-block --file ${file}`,
    `PROGRAM_ID=$(curl -sS ${base}/coach/blocks \\`,
    coachHeadersPrint(),
    "  -H 'Content-Type: application/json' \\",
    `  --data-binary @<(npm run -s assign:from-intake -- --print-block --file ${file}) | python3 -c "import sys,json; print(json.load(sys.stdin)['program']['id'])")`,
    "",
    "# 3. Assign to a roster member (replaces their active block)",
    `curl -sS ${base}/coach/blocks/$PROGRAM_ID/assign \\`,
    coachHeadersPrint(),
    "  -H 'Content-Type: application/json' \\",
    `  -d '{"email":"${email}"}'`,
    "",
    "# 4. Verify the member sees the block",
    `MEMBER=$(curl -sS ${base}/auth/magic-link \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d '{"email":"${email}"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")`,
    `curl -sS ${base}/training -H "Authorization: Bearer $MEMBER"`,
  );
  console.log(lines.join("\n"));
}

async function jsonRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<unknown> {
  const response = await fetch(url, init);
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} → ${response.status}: ${text}`);
  }
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Expected object, got: ${JSON.stringify(value)}`);
}

async function runFlow(args: Args, block: ReturnType<typeof blockFromIntake>, email: string): Promise<void> {
  const base = args.baseUrl.replace(/\/$/, "");
  const coachKey = process.env.COACH_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (coachKey) {
    headers["X-Coach-Key"] = coachKey;
    console.error("Auth: X-Coach-Key");
  } else {
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
  }

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
  const assigned = await jsonRequest(`${base}/coach/blocks/${String(program.id)}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
  console.log(JSON.stringify(assigned, null, 2));

  console.error(`Verifying GET /training as ${email}…`);
  const memberLogin = asRecord(
    await jsonRequest(`${base}/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );
  const memberSession = asRecord(memberLogin.session);
  const training = asRecord(
    await jsonRequest(`${base}/training`, {
      headers: { Authorization: `Bearer ${String(memberSession.accessToken)}` },
    }),
  );
  const trainingProgram = asRecord(training.program);
  const trainingWorkouts = Array.isArray(training.workouts) ? training.workouts : [];
  console.error(
    `Member home: ${String(trainingProgram.title)} · ${trainingWorkouts.length} sessions · assignment ${asRecord(training.assignment).status}`,
  );
  console.log(JSON.stringify({ program: training.program, assignment: training.assignment, workoutCount: trainingWorkouts.length }, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const file = resolve(args.file);
  const intake = loadIntake(file);
  const email = args.email?.trim() || resolveIntakeEmail(intake) || "member@ajax.local";
  const block = blockFromIntake(intake);

  if (args.printBlock) {
    console.log(JSON.stringify(block, null, 2));
    return;
  }
  if (args.run) {
    await runFlow(args, block, email);
    return;
  }
  printFlow(args, file, email);
}

void main();
