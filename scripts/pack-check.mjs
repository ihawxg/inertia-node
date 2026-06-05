import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const packages = [
  "packages/core",
  "packages/express",
  "packages/nest",
  "packages/nest-fastify",
  "packages/ssr",
  "packages/create",
];
const outDir = join(tmpdir(), "inertia-node-pack-check");
const appDir = join(outDir, "consumer");
const packageTarballs = new Map();

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const packagePath of packages) {
  const manifest = JSON.parse(
    await readFile(join(root, packagePath, "package.json"), "utf8"),
  );
  const tarballName = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;

  packageTarballs.set(manifest.name, `file:${join(outDir, tarballName)}`);

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
        "@inertia-node/core": packageTarballs.get("@inertia-node/core"),
        "@inertia-node/express": packageTarballs.get("@inertia-node/express"),
        "@inertia-node/nest": packageTarballs.get("@inertia-node/nest"),
        "@inertia-node/nest-fastify": packageTarballs.get(
          "@inertia-node/nest-fastify",
        ),
        "@inertia-node/ssr": packageTarballs.get("@inertia-node/ssr"),
        "@inertia-node/create": packageTarballs.get("@inertia-node/create"),
        "@fastify/cookie": "^11.0.2",
        "@fastify/session": "^11.1.1",
        "@nestjs/common": "^11.1.9",
        "@nestjs/core": "^11.1.9",
        "@nestjs/platform-fastify": "^11.1.9",
        express: "^5.2.1",
        "express-session": "^1.18.2",
        fastify: "^5.6.2",
        "reflect-metadata": "^0.2.2",
        rxjs: "^7.8.2",
      },
      devDependencies: {
        "@types/express": "^5.0.6",
        "@types/express-session": "^1.18.2",
        "@types/node": "^24.10.1",
        typescript: "^5.9.3",
      },
      pnpm: {
        overrides: {
          "@inertia-node/core": packageTarballs.get("@inertia-node/core"),
          "@inertia-node/express": packageTarballs.get("@inertia-node/express"),
          "@inertia-node/nest": packageTarballs.get("@inertia-node/nest"),
          "@inertia-node/nest-fastify": packageTarballs.get(
            "@inertia-node/nest-fastify",
          ),
          "@inertia-node/ssr": packageTarballs.get("@inertia-node/ssr"),
          "@inertia-node/create": packageTarballs.get("@inertia-node/create"),
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
import { Inertia, InertiaModule, nestExpressSessionAdapter } from "@inertia-node/nest";
import { Inertia as FastifyInertia, InertiaModule as FastifyInertiaModule, fastifySessionAdapter } from "@inertia-node/nest-fastify";
import { createSsrServer } from "@inertia-node/ssr";
import { resolveCreateAppConfig } from "@inertia-node/create";

const app = express();
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(inertiaMiddleware({ session: expressSessionAdapter() }));
app.get("/", (_req, res) => void res.inertia("Home", { stats: defer(() => ({ users: 1 })) }));
await createInertia().render({ headers: {}, method: "GET", url: "/" }, "Home");
InertiaModule.forRoot({ session: nestExpressSessionAdapter() });
FastifyInertiaModule.forRoot({ session: fastifySessionAdapter() });
void Inertia.render("Home");
void FastifyInertia.render("Home");
void createSsrServer;
void resolveCreateAppConfig({ name: "consumer", dryRun: true });
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
