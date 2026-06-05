import "reflect-metadata";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import {
  Controller,
  Get,
  Module,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { createServer as createViteServer } from "vite";
import {
  defer,
  fastifySessionAdapter,
  Inertia,
  inertiaAuth,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  merge,
} from "@inertia-node/nest-fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

interface User {
  id: number;
  email: string;
  name: string;
  password: string;
}

declare module "fastify" {
  interface Session {
    userId?: number;
  }
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface StoredSession {
  [key: string]: unknown;
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
  { id: 1, message: "Nest Fastify controller rendered dashboard" },
  { id: 2, message: "Inertia Fastify interceptor sent the page" },
];
const devBootId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const port = Number(process.env.PORT ?? 3000);
const vitePort = Number(process.env.VITE_PORT ?? port + 10000);
const viteOrigin = `http://localhost:${vitePort}`;

class FileSessionStore {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });

    if (!existsSync(filePath)) {
      writeFileSync(filePath, "{}", "utf8");
    }
  }

  get(
    sessionId: string,
    callback: (error?: unknown, session?: StoredSession | null) => void,
  ): void {
    callback(undefined, this.read()[sessionId] ?? null);
  }

  set(
    sessionId: string,
    value: StoredSession,
    callback: (error?: unknown) => void,
  ): void {
    const sessions = this.read();
    sessions[sessionId] = value;
    this.write(sessions);
    callback();
  }

  destroy(sessionId: string, callback: (error?: unknown) => void): void {
    const sessions = this.read();
    delete sessions[sessionId];
    this.write(sessions);
    callback();
  }

  private read(): Record<string, StoredSession> {
    try {
      return JSON.parse(readFileSync(this.filePath, "utf8")) as Record<
        string,
        StoredSession
      >;
    } catch {
      return {};
    }
  }

  private write(sessions: Record<string, StoredSession>): void {
    writeFileSync(this.filePath, JSON.stringify(sessions, null, 2), "utf8");
  }
}

@Controller()
class DevController {
  @Get("/__inertia-node-dev/reload")
  reload(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    reply.raw.write(`event: boot\ndata: ${devBootId}\n\n`);

    const keepAlive = setInterval(() => {
      reply.raw.write(": keep-alive\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
    });
  }
}

@Controller()
@UseInterceptors(InertiaInterceptor)
class AppController {
  @Get("/")
  home() {
    return Inertia.redirect("/dashboard");
  }

  @Get("/login")
  @UseGuards(InertiaGuestGuard)
  @Inertia("Auth/Login")
  login() {
    return {};
  }

  @Post("/login")
  async authenticate(@Req() request: FastifyRequest) {
    const body = (request.body ?? {}) as LoginBody;
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = "Email is required.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      return Inertia.backWithErrors(errors);
    }

    const user = users.find(
      (candidate) =>
        candidate.email === email && candidate.password === password,
    );

    if (!user) {
      return Inertia.backWithErrors({
        email: "These credentials do not match our records.",
      });
    }

    await request.auth?.login(user);
    await request.flash("success", "Welcome back");
    return Inertia.redirect("/dashboard");
  }

  @Post("/logout")
  async logout(@Req() request: FastifyRequest) {
    await request.auth?.logout();
    return Inertia.redirect("/login");
  }

  @Get("/dashboard")
  @UseGuards(InertiaAuthGuard)
  @Inertia("Dashboard/Index")
  dashboard() {
    return {
      stats: defer(() => ({
        users: users.length,
        activity: activity.length,
      })),
      activity: merge(() => ({ data: activity })).append("data"),
    };
  }
}

@Module({
  imports: [
    InertiaModule.forRoot({
      version: "dev",
      session: fastifySessionAdapter(),
      auth: inertiaAuth({
        getUser: (request) =>
          users.find((user) => user.id === request.session.get("userId")) ??
          null,
        login: (request, user: User) => {
          request.session.set("userId", user.id);
        },
        logout: (request) => {
          request.session.set("userId", undefined);
        },
        serializeUser: (user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
        }),
      }),
      share: () => ({
        appName: "Inertia Node Nest Fastify Adapter",
      }),
      rootView: ({ page }) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inertia Node Nest Fastify Adapter</title>
    <script type="module">
      import RefreshRuntime from "${viteOrigin}/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="${viteOrigin}/@vite/client"></script>
    <script type="module" src="${viteOrigin}/src/app.tsx"></script>
    <script>
      (() => {
        if (!("EventSource" in window)) return;
        const key = "__inertia_node_nest_fastify_dev_boot_id__";
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
  ],
  controllers: [AppController, DevController],
})
class AppModule {}

function createFileSessionStore(): FileSessionStore {
  return new FileSessionStore(
    join(process.cwd(), ".tmp", "nest-fastify-example-sessions.json"),
  );
}

const vite = await createViteServer({
  server: {
    host: "127.0.0.1",
    port: vitePort,
    strictPort: true,
  },
  appType: "custom",
});
await vite.listen();

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  {
    logger: ["error", "warn", "log"],
  },
);

await app.register(fastifyCookie);
await app.register(fastifySession, {
  secret: "inertia-node-nest-fastify-example",
  cookie: { secure: false },
  saveUninitialized: false,
  store: createFileSessionStore() as never,
});
await app.init();
await app.listen(port, "0.0.0.0");

console.log(`Nest Fastify example running at http://localhost:${port}`);
console.log(`Vite dev server running at ${viteOrigin}`);
