import { config, createVercelHandler } from "../apps/api/src/vercel.js";

export { config };

/** Vercel Node entry. Must stay ESM (root package.json `"type": "module"`). */
export default await createVercelHandler();
