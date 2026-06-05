import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@inertia-node/core": `${root}packages/core/src/index.ts`,
      "@inertia-node/express": `${root}packages/express/src/index.ts`,
      "@inertia-node/nest": `${root}packages/nest/src/index.ts`,
      "@inertia-node/nest-fastify": `${root}packages/nest-fastify/src/index.ts`,
      "@inertia-node/create": `${root}packages/create/src/index.ts`,
    },
  },
});
