import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  runtime: "nodejs",
};

type VercelHandler = (
  req: Request | IncomingMessage,
  res?: ServerResponse,
) => unknown;

let loaded: Promise<VercelHandler> | undefined;

/** Dynamic import: a static re-export of the ESM workspace handler becomes CJS require(). */
async function loadHandler() {
  const { createVercelHandler } = await import("../apps/api/src/vercel.js");
  return createVercelHandler();
}

export default async function handler(req: Request | IncomingMessage, res?: ServerResponse) {
  loaded ??= loadHandler();
  const impl = await loaded;
  return impl(req, res);
}
