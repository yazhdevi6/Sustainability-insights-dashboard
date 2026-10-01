import { env, llmMode } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  console.log(
    llmMode === "gemini"
      ? `LLM: Gemini (${env.GEMINI_MODEL})`
      : "LLM: mock mode (GEMINI_API_KEY not set). Insights are template-generated.",
  );
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
