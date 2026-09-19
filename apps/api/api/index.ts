import type { IncomingMessage, ServerResponse } from "node:http";
import { handle as nodeHandle } from "@hono/node-server/vercel";
import { createRuntimeApp } from "../src/server.js";

export const config = {
  runtime: "nodejs",
};

const { app } = await createRuntimeApp();
const asNode = nodeHandle(app);

/** Web Fetch (Fluid / hono/vercel style) or classic Node (req, res). */
export default function handler(req: Request | IncomingMessage, res?: ServerResponse) {
  if (res) return asNode(req as IncomingMessage, res);
  return app.fetch(req as Request);
}
