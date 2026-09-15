import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { port, runtimeMode } from "./env.js";
import { tryCreatePostgresStore } from "./postgres.js";
import { memoryRepo, postgresRepo } from "./repo.js";

const postgres = await tryCreatePostgresStore();
const store = postgres ? postgresRepo(postgres) : memoryRepo();
const app = createApp(store);
const listenPort = port();

serve({ fetch: app.fetch, port: listenPort }, (info) => {
  const storeKind = postgres ? "postgres" : "memory";
  console.log(`Ajax API listening on http://localhost:${info.port} (${runtimeMode()} / ${storeKind})`);
});
