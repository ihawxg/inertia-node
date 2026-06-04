import type { CreateAppConfig, GeneratedFile } from "./types.js";

export function buildGeneratedFiles(config: CreateAppConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [
    file("package.json", json(packageJson(config))),
    file("tsconfig.json", json(tsconfigJson(config))),
    file("vite.config.ts", viteConfig()),
    file(".gitignore", gitignore()),
    file("README.md", readme(config)),
    file("src/app.tsx", appTsx()),
    file("src/style.css", styleCss(config)),
    file("src/server.ts", serverTs(config)),
    file("src/Pages/Home.tsx", homePage(config)),
  ];

  if (config.auth.mode !== "none") {
    files.push(file("src/Pages/Auth/Login.tsx", loginPage()));
  }

  if (config.features.dashboard) {
    files.push(file("src/Pages/Dashboard/Index.tsx", dashboardPage()));
  }

  if (config.features.userCrud) {
    files.push(file("src/Pages/Users/Index.tsx", usersPage()));
  }

  if (config.inertia.ssr) {
    files.push(file("src/ssr.tsx", ssrTsx()));
  }

  if (config.database.orm !== "none") {
    files.push(
      file("src/db.ts", dbTs(config)),
      file("src/seed.ts", seedTs()),
      file("drizzle.config.ts", drizzleConfig(config)),
    );
  }

  if (config.deployment.envExample) {
    files.push(file(".env.example", envExample(config)));
  }

  if (config.quality.prettier) {
    files.push(
      file(".prettierrc.json", json({ semi: true, singleQuote: false })),
    );
  }

  if (config.quality.eslint) {
    files.push(file("eslint.config.js", eslintConfig()));
  }

  if (config.testing.sampleTests) {
    files.push(file("src/server.test.ts", serverTest(config)));
  }

  if (config.deployment.dockerfile) {
    files.push(file("Dockerfile", dockerfile(config)));
  }

  if (config.deployment.dockerCompose) {
    files.push(file("docker-compose.yml", dockerCompose(config)));
  }

  if (config.deployment.githubActions) {
    files.push(file(".github/workflows/ci.yml", githubActions(config)));
  }

  if (config.automation.dependencyUpdates === "dependabot") {
    files.push(file(".github/dependabot.yml", dependabot()));
  }

  return files;
}

function file(path: string, contents: string): GeneratedFile {
  return {
    path,
    contents: contents.endsWith("\n") ? contents : `${contents}\n`,
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function packageJson(config: CreateAppConfig) {
  const dependencies: Record<string, string> = {
    "@inertia-node/express": "^0.1.0",
    "@inertiajs/react": "3.3.0",
    "@vitejs/plugin-react": "^5.1.1",
    express: "^5.2.1",
    react: "^19.2.3",
    "react-dom": "^19.2.3",
    vite: "^7.2.7",
  };
  const devDependencies: Record<string, string> = {
    "@types/express": "^5.0.6",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    tsx: "^4.22.4",
    typescript: "^5.9.3",
  };
  const scripts: Record<string, string> = {
    dev: "tsx watch --clear-screen=false src/server.ts",
    start: "tsx src/server.ts",
    build: "vite build",
    typecheck: "tsc -p tsconfig.json --noEmit",
  };

  if (config.server.sessions !== "none" || config.auth.mode !== "none") {
    dependencies["express-session"] = "^1.18.2";
    devDependencies["@types/express-session"] = "^1.18.2";
  }

  if (config.server.validation === "zod") {
    dependencies.zod = "^4.4.3";
  }

  if (config.auth.mode !== "none") {
    dependencies.bcryptjs = "^3.0.3";
  }

  if (config.database.orm === "drizzle") {
    dependencies["drizzle-orm"] = "^0.45.2";
    devDependencies["drizzle-kit"] = "^0.31.8";
    scripts["db:generate"] = "drizzle-kit generate";
    scripts["db:seed"] = "tsx src/seed.ts";

    if (config.database.driver === "sqlite") {
      dependencies["better-sqlite3"] = "^12.10.0";
      devDependencies["@types/better-sqlite3"] = "^7.6.13";
    }

    if (config.database.driver === "postgres") {
      dependencies.pg = "^8.21.0";
      devDependencies["@types/pg"] = "^8.16.0";
    }

    if (config.database.driver === "mysql") {
      dependencies.mysql2 = "^3.22.4";
    }
  }

  if (config.inertia.ssr) {
    dependencies["@inertia-node/ssr"] = "^0.1.0";
    scripts.ssr =
      "vite build --ssr src/ssr.tsx && inertia-node-ssr --entry dist/ssr.js";
  }

  if (config.quality.eslint) {
    devDependencies["@eslint/js"] = "^9.39.1";
    devDependencies.eslint = "^9.39.1";
    devDependencies["typescript-eslint"] = "^8.48.1";
    scripts.lint = "eslint .";
  }

  if (config.quality.prettier) {
    devDependencies.prettier = "^3.7.3";
    scripts.format = "prettier --write .";
    scripts["format:check"] = "prettier --check .";
  }

  if (config.testing.unit === "vitest") {
    devDependencies.vitest = "^4.0.15";
    scripts.test = "vitest run";
  }

  if (config.testing.api === "supertest") {
    devDependencies.supertest = "^7.1.4";
    devDependencies["@types/supertest"] = "^6.0.3";
  }

  if (config.testing.e2e === "playwright") {
    devDependencies["@playwright/test"] = "^1.57.0";
    scripts["test:e2e"] = "playwright test";
  }

  return {
    name: config.meta.name,
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: `${config.meta.packageManager}@latest`,
    scripts,
    dependencies,
    devDependencies,
    engines: {
      node: `>=${config.meta.nodeVersion}`,
    },
  };
}

function tsconfigJson(config: CreateAppConfig) {
  return {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      jsx: "react-jsx",
      strict: config.quality.strictTs,
      esModuleInterop: true,
      isolatedModules: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      noUncheckedIndexedAccess: config.quality.strictTs,
      paths: {
        [config.meta.importAlias]: ["./src/*"],
      },
      types: ["node", "vite/client"],
    },
    include: ["src", "vite.config.ts", "drizzle.config.ts", "eslint.config.js"],
  };
}

function viteConfig(): string {
  return `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
`;
}

function gitignore(): string {
  return `node_modules
dist
.env
.tmp
coverage
playwright-report
test-results
`;
}

function appTsx(): string {
  return `import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import "./style.css";

createInertiaApp({
  resolve: (name: string) => {
    const pages = import.meta.glob<{ default: unknown }>("./Pages/**/*.tsx", {
      eager: true,
    });
    const page = pages[\`./Pages/\${name}.tsx\`];

    if (!page || typeof page !== "object" || !("default" in page)) {
      throw new Error(\`Page not found: \${name}\`);
    }

    return page.default;
  },
  setup({ el, App, props }: any) {
    createRoot(el).render(<App {...props} />);
  },
});
`;
}

function serverTs(config: CreateAppConfig): string {
  const hasAuth = config.auth.mode !== "none";
  const hasSession = config.server.sessions !== "none" || hasAuth;
  const hasValidation = config.server.validation === "zod";
  const imports = [
    `import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";`,
    `import { dirname, join } from "node:path";`,
    `import express from "express";`,
    hasSession ? `import session from "express-session";` : "",
    hasValidation ? `import { z } from "zod";` : "",
    `import { createServer as createViteServer } from "vite";`,
    `import {
  ${[
    config.inertia.deferredProps ? "defer" : "",
    hasSession ? "expressSessionAdapter" : "",
    hasAuth ? "inertiaAuth" : "",
    "inertiaMiddleware",
    config.inertia.mergeProps ? "merge" : "",
    hasAuth ? "requireAuth" : "",
  ]
    .filter(Boolean)
    .join(",\n  ")}
} from "@inertia-node/express";`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${imports}

interface User {
  id: number;
  email: string;
  name: string;
  password: string;
}

${hasSession ? sessionDeclaration() : ""}
const users: User[] = [
  {
    id: 1,
    email: "ada@example.com",
    name: "Ada Lovelace",
    password: "password",
  },
];
const activity = [
  { id: 1, message: "Dashboard opened" },
  { id: 2, message: "Inertia Node installed" },
];
const devBootId = \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
const port = Number(process.env.PORT ?? 3000);

${hasSession ? fileSessionStore() : ""}
${hasValidation ? loginSchema() : ""}
export async function createApp() {
  const app = express();
  const vite = await createViteServer({
    server: {
      hmr: {
        port: port + 10000,
      },
      middlewareMode: true,
    },
    appType: "custom",
  });

  app.get("/__inertia-node-dev/reload", (request, response) => {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders?.();
    response.write(\`event: boot\\ndata: \${devBootId}\\n\\n\`);

    const keepAlive = setInterval(() => {
      response.write(": keep-alive\\n\\n");
    }, 15000);

    request.on("close", () => {
      clearInterval(keepAlive);
    });
  });
  app.use(vite.middlewares);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
${hasSession ? sessionMiddleware() : ""}
  app.use(
    inertiaMiddleware({
      version: "dev",
${hasSession ? "      session: expressSessionAdapter(),\n" : ""}${hasAuth ? authMiddlewareConfig() : ""}      share: () => ({
        appName: "${title(config.meta.name)}",
      }),
      rootView: ({ page${config.inertia.ssr ? ", ssr" : ""} }) => \`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title(config.meta.name)}</title>
${config.inertia.ssr ? '    ${ssr?.head.join("\\n") ?? ""}\n' : ""}    <script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/app.tsx"></script>
    <script>
      (() => {
        if (!("EventSource" in window)) return;
        const key = "__inertia_node_dev_boot_id__";
        const events = new EventSource("/__inertia-node-dev/reload");
        events.addEventListener("boot", (event) => {
          const previous = sessionStorage.getItem(key);
          sessionStorage.setItem(key, event.data);
          if (previous && previous !== event.data) {
            window.location.reload();
          }
        });
      })();
    </script>
  </head>
  <body>
    <script data-page="app" type="application/json">\${page}</script>
    <div id="app">${config.inertia.ssr ? '${ssr?.body ?? ""}' : ""}</div>
  </body>
</html>\`,
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/", (_request, response) => {
${hasAuth ? '    response.redirect("/dashboard");' : '    void response.inertia("Home");'}
  });

${hasAuth ? authRoutes(hasValidation) : ""}
${dashboardRoute(config, hasAuth)}
${usersRoute(config, hasAuth)}
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = await createApp();

  app.listen(port, () => {
    console.log(\`App running at http://localhost:\${port}\`);
  });
}
`;
}

function sessionDeclaration(): string {
  return `declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
`;
}

function fileSessionStore(): string {
  return `class FileSessionStore extends session.Store {
  constructor(private readonly filePath: string) {
    super();
    mkdirSync(dirname(filePath), { recursive: true });

    if (!existsSync(filePath)) {
      writeFileSync(filePath, "{}", "utf8");
    }
  }

  get(
    sessionId: string,
    callback: (error: unknown, session?: session.SessionData | null) => void,
  ): void {
    callback(null, this.read()[sessionId] ?? null);
  }

  set(
    sessionId: string,
    value: session.SessionData,
    callback?: (error?: unknown) => void,
  ): void {
    const sessions = this.read();
    sessions[sessionId] = value;
    this.write(sessions);
    callback?.();
  }

  destroy(sessionId: string, callback?: (error?: unknown) => void): void {
    const sessions = this.read();
    delete sessions[sessionId];
    this.write(sessions);
    callback?.();
  }

  private read(): Record<string, session.SessionData> {
    try {
      return JSON.parse(readFileSync(this.filePath, "utf8")) as Record<
        string,
        session.SessionData
      >;
    } catch {
      return {};
    }
  }

  private write(sessions: Record<string, session.SessionData>): void {
    writeFileSync(this.filePath, JSON.stringify(sessions, null, 2), "utf8");
  }
}

function createFileSessionStore(): FileSessionStore {
  return new FileSessionStore(join(process.cwd(), ".tmp", "sessions.json"));
}
`;
}

function loginSchema(): string {
  return `const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
`;
}

function sessionMiddleware(): string {
  return `  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "change-me",
      store: createFileSessionStore(),
      resave: false,
      saveUninitialized: false,
    }),
  );
`;
}

function authMiddlewareConfig(): string {
  return `      auth: inertiaAuth({
        getUser: (request) =>
          users.find((user) => user.id === request.session.userId) ?? null,
        login: (request, user: User) => {
          request.session.userId = user.id;
        },
        logout: (request) => {
          delete request.session.userId;
        },
        serializeUser: (user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
        }),
      }),
`;
}

function authRoutes(hasValidation: boolean): string {
  const validation = hasValidation
    ? `  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    await response.backWithErrors(
      Object.fromEntries(
        Object.entries(z.flattenError(parsed.error).fieldErrors).map(
          ([field, messages]) => [field, messages?.[0] ?? "Invalid value."],
        ),
      ),
    );
    return;
  }

  const { email, password } = parsed.data;`
    : `  const email = String(request.body.email ?? "");
  const password = String(request.body.password ?? "");

  if (!email || !password) {
    await response.backWithErrors({
      email: email ? "" : "Email is required.",
      password: password ? "" : "Password is required.",
    });
    return;
  }`;

  return `  app.get("/login", (_request, response) => {
    void response.inertia("Auth/Login");
  });

  app.post("/login", async (request, response) => {
${validation}

  const user = users.find(
    (candidate) => candidate.email === email && candidate.password === password,
  );

  if (!user) {
    await response.backWithErrors({
      email: "These credentials do not match our records.",
    });
    return;
  }

  await request.auth?.login(user);
  await request.flash("success", "Welcome back");
  response.inertiaRedirect("/dashboard");
  });

  app.post("/logout", async (request, response) => {
    await request.auth?.logout();
    response.inertiaRedirect("/login");
  });
`;
}

function dashboardRoute(config: CreateAppConfig, hasAuth: boolean): string {
  if (!config.features.dashboard) {
    return "";
  }

  const middleware = hasAuth ? ", requireAuth()" : "";
  const stats = config.inertia.deferredProps
    ? `defer(() => ({
        users: users.length,
        activity: activity.length,
      }))`
    : `{
        users: users.length,
        activity: activity.length,
      }`;
  const activityProp = config.inertia.mergeProps
    ? `merge(() => ({ data: activity })).append("data")`
    : "{ data: activity }";

  return `  app.get("/dashboard"${middleware}, (_request, response) => {
    void response.inertia("Dashboard/Index", {
      stats: ${stats},
      activity: ${activityProp},
    });
  });
`;
}

function usersRoute(config: CreateAppConfig, hasAuth: boolean): string {
  if (!config.features.userCrud) {
    return "";
  }

  const middleware = hasAuth ? ", requireAuth()" : "";

  return `  app.get("/users"${middleware}, (_request, response) => {
    void response.inertia("Users/Index", {
      users: [
        { id: 1, name: "Ada Lovelace", role: "Admin" },
        { id: 2, name: "Katherine Johnson", role: "Maintainer" },
        { id: 3, name: "Grace Hopper", role: "Contributor" },
      ],
    });
  });
`;
}

function homePage(config: CreateAppConfig): string {
  return `import { Link } from "@inertiajs/react";

export default function Home() {
  return (
    <main className="shell compact">
      <section className="panel auth-panel">
        <p className="eyebrow">Inertia Node</p>
        <h1>${title(config.meta.name)}</h1>
        <p className="muted">Express, React, TypeScript, and Inertia are wired.</p>
        <Link className="button" href="${config.auth.mode === "none" ? "/dashboard" : "/login"}">
          Open app
        </Link>
      </section>
    </main>
  );
}
`;
}

function loginPage(): string {
  return `import { router, usePage } from "@inertiajs/react";
import type { FormEvent } from "react";

interface LoginPageProps {
  errors: {
    email?: string;
    password?: string;
  };
  flash: {
    success?: string;
  };
}

export default function Login() {
  const { errors, flash } = usePage().props as unknown as LoginPageProps;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    router.post("/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
  }

  return (
    <main className="shell compact">
      <section className="panel auth-panel">
        <p className="eyebrow">Protected starter</p>
        <h1>Sign in</h1>
        {flash.success ? <p className="notice success">{flash.success}</p> : null}
        <form className="form" onSubmit={submit}>
          <label>
            Email
            <input name="email" defaultValue="ada@example.com" />
          </label>
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
          <label>
            Password
            <input name="password" type="password" defaultValue="password" />
          </label>
          {errors.password ? (
            <p className="field-error">{errors.password}</p>
          ) : null}
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}
`;
}

function dashboardPage(): string {
  return `import { Deferred, Link, router, usePage } from "@inertiajs/react";

interface Activity {
  id: number;
  message: string;
}

interface DashboardProps {
  auth?: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  flash: {
    success?: string;
  };
  stats?: {
    users: number;
    activity: number;
  };
  activity: {
    data: Activity[];
  };
}

export default function Dashboard() {
  const { auth, flash, activity } = usePage()
    .props as unknown as DashboardProps;

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Full-stack Node</p>
          <h1>Welcome{auth?.user ? \`, \${auth.user.name}\` : ""}</h1>
        </div>
        <nav className="actions">
          <Link className="button secondary" href="/users">
            Users
          </Link>
          {auth?.user ? (
            <button className="secondary" onClick={() => router.post("/logout")}>
              Log out
            </button>
          ) : null}
        </nav>
      </header>

      {flash.success ? <p className="notice success">{flash.success}</p> : null}

      <section className="panel">
        <h2>Deferred stats</h2>
        <Deferred
          data="stats"
          fallback={<p className="muted">Loading stats...</p>}
        >
          <Stats />
        </Deferred>
      </section>

      <section className="panel">
        <h2>Mergeable activity</h2>
        <div className="table">
          {activity.data.map((item) => (
            <div className="row" key={item.id}>
              <span>{item.message}</span>
              <span>#{item.id}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stats() {
  const { stats } = usePage().props as unknown as DashboardProps;

  if (!stats) {
    return null;
  }

  return (
    <div className="stats-grid">
      <div>
        <strong>{stats.users}</strong>
        <span>Users</span>
      </div>
      <div>
        <strong>{stats.activity}</strong>
        <span>Events</span>
      </div>
    </div>
  );
}
`;
}

function usersPage(): string {
  return `import { Link, usePage } from "@inertiajs/react";

interface UserRow {
  id: number;
  name: string;
  role: string;
}

interface UsersProps {
  users: UserRow[];
}

export default function Users() {
  const { users } = usePage().props as unknown as UsersProps;

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Users</h1>
        </div>
        <Link className="button secondary" href="/dashboard">
          Dashboard
        </Link>
      </header>
      <section className="panel">
        <div className="table">
          {users.map((user) => (
            <div className="row" key={user.id}>
              <span>{user.name}</span>
              <span>{user.role}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
`;
}

function ssrTsx(): string {
  return `import { createInertiaApp } from "@inertiajs/react";
import createServer from "@inertiajs/react/server";
import React from "react";
import { renderToString } from "react-dom/server";

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    resolve: (name: string) => {
      const pages = import.meta.glob<{ default: React.ComponentType<any> }>(
        "./Pages/**/*.tsx",
        { eager: true },
      );
      const resolved = pages[\`./Pages/\${name}.tsx\`];

      if (!resolved) {
        throw new Error(\`Page not found: \${name}\`);
      }

      return resolved.default;
    },
    setup: ({ App, props }: any) => <App {...props} />,
  }),
);
`;
}

function dbTs(config: CreateAppConfig): string {
  if (config.database.driver === "sqlite") {
    return `import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
});

const sqlite = new Database(process.env.DATABASE_URL ?? "local.db");

export const db = drizzle(sqlite);
`;
  }

  return `import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import pg from "pg";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
`;
}

function seedTs(): string {
  return `import { hash } from "bcryptjs";
import { db, users } from "./db.js";

await db
  .insert(users)
  .values({
    id: 1,
    email: "ada@example.com",
    name: "Ada Lovelace",
    passwordHash: await hash("password", 10),
  })
  .onConflictDoNothing();

console.log("Seeded demo user: ada@example.com / password");
`;
}

function drizzleConfig(config: CreateAppConfig): string {
  const dialect = config.database.driver === "mysql" ? "mysql" : "sqlite";
  const dbCredentials =
    config.database.driver === "sqlite"
      ? `{ url: process.env.DATABASE_URL ?? "local.db" }`
      : `{ url: process.env.DATABASE_URL ?? "" }`;

  return `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db.ts",
  out: "./drizzle",
  dialect: "${dialect}",
  dbCredentials: ${dbCredentials},
});
`;
}

function styleCss(config: CreateAppConfig): string {
  const bg = config.ui.theme === "slate" ? "#f8fafc" : "#f6f7f9";

  return `:root {
  color: #202124;
  background: ${bg};
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
}

.shell {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 48px;
}

.compact {
  display: grid;
  place-items: center;
}

.header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 0 auto 28px;
  max-width: 880px;
}

.actions {
  display: flex;
  gap: 10px;
}

.eyebrow {
  color: #5f6368;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 8px;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: 34px;
  line-height: 1.15;
}

.panel {
  background: #fff;
  border: 1px solid #d9dde3;
  border-radius: 8px;
  margin: 0 auto 18px;
  max-width: 880px;
  padding: 24px;
}

.auth-panel {
  width: min(100%, 420px);
}

.form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.form label {
  color: #3d434b;
  display: grid;
  font-size: 14px;
  font-weight: 700;
  gap: 8px;
}

.form input {
  border: 1px solid #cbd2d9;
  border-radius: 6px;
  font: inherit;
  padding: 12px;
}

button,
.button {
  background: #1b7f5c;
  border: 0;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: inline-block;
  font: inherit;
  font-weight: 700;
  padding: 10px 14px;
  text-decoration: none;
}

.secondary {
  background: #202124;
}

.notice,
.field-error,
.muted {
  font-size: 14px;
}

.notice {
  border-radius: 6px;
  margin: 0 auto 18px;
  max-width: 880px;
  padding: 12px 14px;
}

.success {
  background: #e7f6ef;
  color: #176444;
}

.field-error {
  color: #b42318;
  margin: 0;
}

.muted {
  color: #5f6368;
}

.stats-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 18px;
}

.stats-grid div {
  background: #f8fafb;
  border: 1px solid #e5e8ec;
  border-radius: 6px;
  display: grid;
  gap: 4px;
  padding: 16px;
}

.stats-grid strong {
  font-size: 28px;
}

.stats-grid span,
.row span:last-child {
  color: #5f6368;
}

.table {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.row {
  align-items: center;
  background: #f8fafb;
  border: 1px solid #e5e8ec;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}

@media (max-width: 640px) {
  .shell {
    padding: 24px;
  }

  .header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
}
`;
}

function envExample(config: CreateAppConfig): string {
  return `PORT=3000
SESSION_SECRET=change-me
${config.database.orm === "none" ? "" : "DATABASE_URL=local.db\n"}`;
}

function eslintConfig(): string {
  return `import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "coverage/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
`;
}

function serverTest(config: CreateAppConfig): string {
  return `import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./server.js";

describe("app", () => {
  it("responds to health checks", async () => {
    const app = await createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

${
  config.auth.mode === "none"
    ? ""
    : `  it("validates login credentials", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/login")
      .set("Referer", "/login")
      .send({ email: "ada@example.com", password: "wrong" });

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe("/login");
  });
`
}
});
`;
}

function dockerfile(config: CreateAppConfig): string {
  const install = installCommand(config.meta.packageManager);
  const build = runCommand(config.meta.packageManager, "build");

  return `FROM node:${config.meta.nodeVersion}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN corepack enable
RUN ${install}

FROM deps AS build
COPY . .
RUN ${build}

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app .
EXPOSE 3000
CMD ["npm", "run", "start"]
`;
}

function dockerCompose(config: CreateAppConfig): string {
  const db =
    config.database.driver === "postgres"
      ? `
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
`
      : "";

  return `services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
${db}`;
}

function githubActions(config: CreateAppConfig): string {
  const pm = config.meta.packageManager;
  const install = installCommand(pm);
  const checks = [
    config.quality.prettier ? runCommand(pm, "format:check") : "",
    config.quality.eslint ? runCommand(pm, "lint") : "",
    runCommand(pm, "typecheck"),
    config.testing.unit !== "none" ? runCommand(pm, "test") : "",
    runCommand(pm, "build"),
  ].filter(Boolean);

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: ${config.meta.nodeVersion}
      - run: corepack enable
      - run: ${install}
${checks.map((check) => `      - run: ${check}`).join("\n")}
`;
}

function dependabot(): string {
  return `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
`;
}

function readme(config: CreateAppConfig): string {
  const pm = config.meta.packageManager;

  return `# ${title(config.meta.name)}

Generated with \`@inertia-node/create\`.

## Stack

- Express + React + Vite + TypeScript
- Inertia Node adapter
- Preset: \`${config.preset.name}\`
- Auth: \`${config.auth.mode}\`
- Database: \`${config.database.orm}/${config.database.driver}\`
- SSR: \`${config.inertia.ssr ? "enabled" : "disabled"}\`

## Run

\`\`\`sh
${installCommand(pm)}
${config.database.seed ? `${runCommand(pm, "db:seed")}\n` : ""}${runCommand(pm, "dev")}
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

${
  config.auth.mode === "none"
    ? ""
    : `Demo login:

- Email: \`ada@example.com\`
- Password: \`password\`

The generated password is demo-only. Replace it with real user storage and password hashing before production.
`
}
## Checks

\`\`\`sh
${[
  config.quality.prettier ? runCommand(pm, "format:check") : "",
  config.quality.eslint ? runCommand(pm, "lint") : "",
  runCommand(pm, "typecheck"),
  config.testing.unit !== "none" ? runCommand(pm, "test") : "",
  runCommand(pm, "build"),
]
  .filter(Boolean)
  .join("\n")}
\`\`\`
`;
}

function installCommand(packageManager: string): string {
  if (packageManager === "npm") {
    return "npm install";
  }

  if (packageManager === "yarn") {
    return "yarn install";
  }

  if (packageManager === "bun") {
    return "bun install";
  }

  return "pnpm install";
}

function runCommand(packageManager: string, script: string): string {
  if (packageManager === "npm") {
    return `npm run ${script}`;
  }

  if (packageManager === "yarn") {
    return `yarn ${script}`;
  }

  if (packageManager === "bun") {
    return `bun run ${script}`;
  }

  return `pnpm ${script}`;
}

function title(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
