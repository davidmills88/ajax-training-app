import { serve } from "@hono/node-server";
import { port, runtimeMode } from "./env.js";
import { createRuntimeApp } from "./server.js";

const { app, storeKind } = await createRuntimeApp();
const listenPort = port();

serve({ fetch: app.fetch, port: listenPort }, (info) => {
  console.log(`Ajax API listening on http://localhost:${info.port} (${runtimeMode()} / ${storeKind})`);
});
