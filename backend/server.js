import { connectDatabase } from "./config/database.js";
import { getEnv } from "./config/env.js";
import { createApp } from "./app.js";

async function startServer() {
  const { nodeEnv, port, staticDir, trustProxy } = getEnv();

  await connectDatabase();

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`API server listening on port ${port}.`);
    console.log(
      `Startup configuration: NODE_ENV=${nodeEnv}, trustProxy=${JSON.stringify(trustProxy)}, staticDir=${staticDir}.`,
    );
  });

  server.on("error", (error) => {
    console.error("API server error:", error.message);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exitCode = 1;
});
