import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import express from "express";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import {
  defer,
  expressSessionAdapter,
  inertiaAuth,
  inertiaMiddleware,
  merge,
  requireAuth,
} from "@inertia-node/express";

interface User {
  id: number;
  email: string;
  name: string;
  password: string;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

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
  { id: 2, message: "Inertia adapter installed" },
];
const devBootId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const port = Number(process.env.PORT ?? 3000);

class FileSessionStore extends session.Store {
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
  return new FileSessionStore(
    join(process.cwd(), ".tmp", "example-sessions.json"),
  );
}

const app = express();
const sessionStore = createFileSessionStore();
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
  response.write(`event: boot\ndata: ${devBootId}\n\n`);

  const keepAlive = setInterval(() => {
    response.write(": keep-alive\n\n");
  }, 15000);

  request.on("close", () => {
    clearInterval(keepAlive);
  });
});
app.use(vite.middlewares);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: "inertia-node-example",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(
  inertiaMiddleware({
    version: "dev",
    session: expressSessionAdapter(),
    auth: inertiaAuth({
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
    share: () => ({
      appName: "Inertia Node Adapter",
    }),
    rootView: ({ page }) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inertia Node Adapter</title>
    <script type="module">
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
    <script data-page="app" type="application/json">${page}</script>
    <div id="app"></div>
  </body>
</html>`,
  }),
);

app.get("/", (_request, response) => {
  response.redirect("/dashboard");
});

app.get("/login", (_request, response) => {
  void response.inertia("Auth/Login");
});

app.post("/login", async (request, response) => {
  const email = String(request.body.email ?? "");
  const password = String(request.body.password ?? "");
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = "Email is required.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (Object.keys(errors).length > 0) {
    await response.backWithErrors(errors);
    return;
  }

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

app.get("/dashboard", requireAuth(), (_request, response) => {
  void response.inertia("Dashboard/Index", {
    stats: defer(() => ({
      users: users.length,
      activity: activity.length,
    })),
    activity: merge(() => ({ data: activity })).append("data"),
  });
});

app.get("/users", requireAuth(), (_request, response) => {
  void response.inertia("Users/Index", {
    users: [
      { id: 1, name: "Hello World", role: "Admin" },
      { id: 2, name: "Hello People", role: "Maintainer" },
      { id: 3, name: "Katherine Johnson", role: "Contributor" },
    ],
  });
});

app.listen(port, () => {
  console.log(`Example running at http://localhost:${port}`);
});
