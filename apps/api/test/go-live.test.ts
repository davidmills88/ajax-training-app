import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";
import { extraCorsOrigins, isAllowedCorsOrigin, resolveCorsOrigin } from "../src/cors.js";
import { postgresPoolSsl } from "../src/postgres-ssl.js";
import { createRuntimeApp } from "../src/server.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("postgres ssl for live Supabase", () => {
  it("enables rejectUnauthorized:false for supabase hosts without NODE_TLS_REJECT_UNAUTHORIZED", () => {
    const previous = process.env.DATABASE_SSL;
    delete process.env.DATABASE_SSL;
    try {
      assert.deepEqual(
        postgresPoolSsl("postgresql://postgres:x@db.abcdefghijkl.supabase.co:5432/postgres"),
        { rejectUnauthorized: false },
      );
      assert.deepEqual(
        postgresPoolSsl("postgresql://postgres.abcdefghijkl:x@aws-0-us-east-1.pooler.supabase.com:6543/postgres"),
        { rejectUnauthorized: false },
      );
      assert.equal(postgresPoolSsl("postgresql://postgres:x@localhost:5432/ajax"), undefined);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_SSL;
      else process.env.DATABASE_SSL = previous;
    }
  });

  it("honors DATABASE_SSL override", () => {
    const previous = process.env.DATABASE_SSL;
    try {
      process.env.DATABASE_SSL = "0";
      assert.equal(postgresPoolSsl("postgresql://postgres:x@db.abcdefghijkl.supabase.co:5432/postgres"), undefined);
      process.env.DATABASE_SSL = "1";
      assert.deepEqual(postgresPoolSsl("postgresql://postgres:x@localhost:5432/ajax"), { rejectUnauthorized: false });
    } finally {
      if (previous === undefined) delete process.env.DATABASE_SSL;
      else process.env.DATABASE_SSL = previous;
    }
  });
});

describe("cors for Expo web + typical origins", () => {
  it("allows Expo web, LAN, preview, and ajaxgym origins", () => {
    const previous = process.env.CORS_ORIGINS;
    delete process.env.CORS_ORIGINS;
    try {
      assert.equal(isAllowedCorsOrigin("http://localhost:8081"), true);
      assert.equal(isAllowedCorsOrigin("http://127.0.0.1:19006"), true);
      assert.equal(isAllowedCorsOrigin("http://192.168.1.20:8081"), true);
      assert.equal(isAllowedCorsOrigin("https://ajax-training.expo.dev"), true);
      assert.equal(isAllowedCorsOrigin("https://ajax-api.vercel.app"), true);
      assert.equal(isAllowedCorsOrigin("https://app.ajaxgym.com"), true);
      assert.equal(resolveCorsOrigin("http://localhost:8081"), "http://localhost:8081");
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
  });

  it("restricts unknown origins when CORS_ORIGINS is a list", () => {
    const previous = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = "https://coach.ajaxgym.com";
    try {
      assert.equal(extraCorsOrigins().includes("https://coach.ajaxgym.com"), true);
      assert.equal(isAllowedCorsOrigin("https://coach.ajaxgym.com"), true);
      assert.equal(isAllowedCorsOrigin("http://localhost:8081"), true);
      assert.equal(resolveCorsOrigin("https://evil.example"), "");
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
  });

  it("returns CORS headers on /health for Expo web", async () => {
    const app = createApp();
    const res = await app.request("/health", {
      headers: { Origin: "http://localhost:8081" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:8081");
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "ajax-api");
  });

  it("answers OPTIONS preflight for typical Expo origin", async () => {
    const app = createApp();
    const res = await app.request("/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:8081",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
      },
    });
    assert.ok(res.status === 204 || res.status === 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:8081");
  });
});

describe("runtime bootstrap", () => {
  it("serves /health from the production entry path in mock mode", async () => {
    const { app, storeKind } = await createRuntimeApp();
    assert.equal(storeKind, "memory");
    const res = await app.request("/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.mode, "mock");
  });
});

describe("vercel ESM function entry", () => {
  it("marks the repo as ESM so Vercel does not CJS-require the workspace package", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    assert.equal(pkg.type, "module");
  });

  it("uses a real root api/ entry instead of a CJS re-export shim", () => {
    const source = readFileSync(join(repoRoot, "api/index.ts"), "utf8");
    assert.match(source, /createVercelHandler/);
    assert.doesNotMatch(source, /from ["']\.\.\/apps\/api\/api\//);
  });

  it("serves GET /health from the Vercel handler in mock mode", async () => {
    const { createVercelHandler } = await import("../src/vercel.js");
    const handler = await createVercelHandler();
    const res = await handler(new Request("https://ajax-training-app.vercel.app/health"));
    assert.ok(res instanceof Response);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "ajax-api");
  });
});

describe("vercel api-only project config", () => {
  function assertApiOnlyVercelJson(config: {
    framework: unknown;
    buildCommand: unknown;
    outputDirectory: unknown;
    rewrites?: { source: string; destination: string }[];
    functions?: Record<string, unknown>;
  }) {
    assert.equal(config.framework, null);
    assert.equal(config.buildCommand, null);
    assert.equal(config.outputDirectory, null);
    const rewrite = config.rewrites?.find((row) => row.destination === "/api");
    assert.ok(rewrite, "expected a rewrite to /api so GET /health is not /api/health");
    assert.ok(config.functions?.["api/index.ts"], "expected the Hono serverless entry");
  }

  it("root vercel.json skips the static public output and routes to api/index.ts", () => {
    const config = JSON.parse(readFileSync(join(repoRoot, "vercel.json"), "utf8"));
    assertApiOnlyVercelJson(config);
  });

  it("apps/api vercel.json matches the same serverless-only settings", () => {
    const config = JSON.parse(readFileSync(join(repoRoot, "apps/api/vercel.json"), "utf8"));
    assertApiOnlyVercelJson(config);
  });
});
