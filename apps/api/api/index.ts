import { handle } from "hono/vercel";
import { createRuntimeApp } from "../src/server.js";

export const config = {
  runtime: "nodejs",
};

const { app } = await createRuntimeApp();

export default handle(app);
