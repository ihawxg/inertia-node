import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const packages = ["packages/core", "packages/express", "packages/ssr"];
const outDir = join(tmpdir(), "inertia-node-pack-check");
const appDir = join(outDir, "consumer");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const packagePath of packages) {
  const result = spawnSync(
    "pnpm",
    ["--dir", join(root, packagePath), "pack", "--pack-destination", outDir],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  process.stdout.write(result.stdout);
}

await mkdir(appDir, { recursive: true });
await writeFile(
  join(appDir, "package.json"),
  JSON.stringify(
    {
      name: "inertia-node-pack-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@inertia-node/core": `file:${join(outDir, "inertia-node-core-0.1.0.tgz")}`,
        "@inertia-node/express": `file:${join(outDir, "inertia-node-express-0.1.0.tgz")}`,
        "@inertia-node/ssr": `file:${join(outDir, "inertia-node-ssr-0.1.0.tgz")}`,
        express: "^5.2.1",
        "express-session": "^1.18.2",
      },
      devDependencies: {
        "@types/express": "^5.0.6",
        "@types/express-session": "^1.18.2",
        "@types/node": "^24.10.1",
        typescript: "^5.9.3",
      },
      pnpm: {
        overrides: {
          "@inertia-node/core": `file:${join(outDir, "inertia-node-core-0.1.0.tgz")}`,
          "@inertia-node/express": `file:${join(outDir, "inertia-node-express-0.1.0.tgz")}`,
          "@inertia-node/ssr": `file:${join(outDir, "inertia-node-ssr-0.1.0.tgz")}`,
        },
      },
    },
    null,
    2,
  ),
);
await writeFile(
  join(appDir, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
      },
      include: ["index.ts"],
    },
    null,
    2,
  ),
);
await writeFile(
  join(appDir, "index.ts"),
  `import express from "express";
import session from "express-session";
import { createInertia, defer } from "@inertia-node/core";
import { expressSessionAdapter, inertiaMiddleware } from "@inertia-node/express";
import { createSsrServer } from "@inertia-node/ssr";

const app = express();
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(inertiaMiddleware({ session: expressSessionAdapter() }));
app.get("/", (_req, res) => void res.inertia("Home", { stats: defer(() => ({ users: 1 })) }));
await createInertia().render({ headers: {}, method: "GET", url: "/" }, "Home");
void createSsrServer;
`,
);

const tarballs = (await readdir(outDir)).filter((file) =>
  file.endsWith(".tgz"),
);

if (tarballs.length !== packages.length) {
  throw new Error(
    `Expected ${packages.length} tarballs, found ${tarballs.length}`,
  );
}

run("pnpm", ["install"], appDir);
run("pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"], appDir);

console.log(`Package tarballs and consumer app written to ${outDir}`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  process.stdout.write(result.stdout);
}
