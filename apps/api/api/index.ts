import { config, createVercelHandler } from "../src/vercel.js";

export { config };

/** Alternate Root Directory `apps/api` — same ESM handler as repo-root `api/index.ts`. */
export default await createVercelHandler();
