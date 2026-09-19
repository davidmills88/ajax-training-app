import { createApp } from "./app.js";
import { tryCreatePostgresStore } from "./postgres.js";
import { memoryRepo, postgresRepo } from "./repo.js";

export async function createRuntimeApp() {
  const postgres = await tryCreatePostgresStore();
  const store = postgres ? postgresRepo(postgres) : memoryRepo();
  return {
    app: createApp(store),
    storeKind: postgres ? ("postgres" as const) : ("memory" as const),
  };
}
