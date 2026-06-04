import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import type { InertiaPage, SsrResult } from "@inertia-node/core";

export type SsrRenderFunction = (
  page: InertiaPage,
) => SsrResult | Promise<SsrResult>;

export interface SsrServerOptions {
  entry: string;
  host?: string;
  port?: number;
}

export async function loadRenderer(entry: string): Promise<SsrRenderFunction> {
  const moduleUrl = entry.startsWith("file:")
    ? entry
    : pathToFileURL(entry).href;
  const mod = (await import(`${moduleUrl}?t=${Date.now()}`)) as {
    default?: SsrRenderFunction;
    render?: SsrRenderFunction;
  };
  const render = mod.render ?? mod.default;

  if (typeof render !== "function") {
    throw new Error(
      "SSR entry must export a render function or default function",
    );
  }

  return render;
}

export async function createSsrServer(options: SsrServerOptions) {
  const render = await loadRenderer(options.entry);

  return createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/render") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    try {
      const page = JSON.parse(await readBody(request)) as InertiaPage;
      sendJson(response, 200, await render(page));
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function listen(options: SsrServerOptions): Promise<void> {
  const server = await createSsrServer(options);
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 13714;

  server.listen(port, host, () => {
    console.log(`Inertia Node SSR server listening on http://${host}:${port}`);
  });
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
