import { connectDatabase } from "./config/database.js";
import { getEnv } from "./config/env.js";
import { createApp } from "./app.js";

async function startServer() {
  const { port } = getEnv();

  await connectDatabase();

  const app = createApp();

  app.listen(port, () => {
    console.log(`API server listening on port ${port}.`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exitCode = 1;
});
