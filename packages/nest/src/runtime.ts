import {
  always,
  validationError,
  type AuthConfig,
  type AuthRuntime,
  type InertiaRequest,
  type InputProps,
  type ProtocolResponse,
  type SessionStore,
  type ValidationErrorInput,
  type ValidationErrorPayload,
} from "@inertia-node/core";
import type { Request, Response } from "express";
import type { NestInertiaOptions } from "./types.js";

export type NestInertiaRequest<User = unknown> = Request & {
  user?: User;
  auth?: AuthRuntime<User>;
  flash(key: string, value: unknown): Promise<void>;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: unknown;
    auth?: AuthRuntime<unknown>;
    flash(key: string, value: unknown): Promise<void>;
  }
}

export function prepareInertiaRequest(
  request: Request,
  options: NestInertiaOptions,
): SessionStore | undefined {
  const sessionStore = options.session?.(request);
  const inertiaRequest = request as NestInertiaRequest;

  inertiaRequest.flash = async (key: string, value: unknown) => {
    await sessionStore?.flash("flash", {
      ...((await sessionStore.get<Record<string, unknown>>("flash")) ?? {}),
      [key]: value,
    });
  };

  if (options.auth && !inertiaRequest.auth) {
    installAuth(inertiaRequest, options.auth);
  }

  return sessionStore;
}

export function sendProtocolResponse(
  request: Request,
  response: Response,
  sessionStore: SessionStore | undefined,
  protocol: ProtocolResponse,
): void {
  if (protocol.status === 409) {
    void sessionStore?.reflash();
    void (
      request as Request & { session?: Record<string, any> }
    ).session?.save?.();
  }

  response.status(protocol.status);

  for (const [name, value] of Object.entries(protocol.headers)) {
    response.setHeader(name, value);
  }

  response.send(protocol.body);
}

export function toInertiaRequest(request: Request): InertiaRequest {
  return {
    headers: request.headers,
    method: request.method,
    url: request.url,
    originalUrl: request.originalUrl,
    protocol: request.protocol,
    host: request.get("host"),
    raw: request,
  };
}

export async function resolveUserShare(
  options: NestInertiaOptions,
  context: { request: InertiaRequest },
): Promise<InputProps> {
  const request = context.request.raw as Request | undefined;

  if (!request || !options.auth) {
    return {};
  }

  prepareInertiaRequest(request, options);

  return {
    auth: always({
      user: await request.auth?.serializedUser(),
    }),
  };
}

export async function flashErrors(
  session: SessionStore,
  payload: ValidationErrorPayload,
  withAllErrors = false,
): Promise<void> {
  const normalized = normalizeErrors(payload.errors, withAllErrors);

  if (payload.bag) {
    await session.flash("errors", {
      [payload.bag]: normalized,
    });
    return;
  }

  await session.flash("errors", normalized);
}

export async function pullErrors(
  session: SessionStore,
  request?: Request,
  withAllErrors = false,
): Promise<Record<string, unknown>> {
  const errors = await session.pull<ValidationErrorInput>("errors");

  if (!errors) {
    return {};
  }

  const bag =
    typeof request?.headers["x-inertia-error-bag"] === "string"
      ? request.headers["x-inertia-error-bag"]
      : undefined;

  if (bag && bag in errors) {
    return {
      [bag]: normalizeErrors(
        errors[bag] as unknown as ValidationErrorInput,
        withAllErrors,
      ),
    };
  }

  return normalizeErrors(errors, withAllErrors);
}

export function validationPayloadForRequest(
  request: Request,
  errors: ValidationErrorInput,
  options: { bag?: string } = {},
): ValidationErrorPayload {
  return validationError(errors, {
    bag:
      options.bag ??
      (typeof request.headers["x-inertia-error-bag"] === "string"
        ? request.headers["x-inertia-error-bag"]
        : undefined),
  });
}

function installAuth<User, Serialized>(
  request: NestInertiaRequest<User>,
  config: AuthConfig<Request, User, Serialized>,
): void {
  let loaded = false;
  let cachedUser: User | null = null;

  async function user(): Promise<User | null> {
    if (!loaded) {
      cachedUser = await config.getUser(request);
      loaded = true;
      request.user = cachedUser ?? undefined;
    }

    return cachedUser;
  }

  const runtime = {
    user,
    check: async () => (await user()) !== null,
    login: async (loginUser: User) => {
      await config.login(request, loginUser);
      cachedUser = loginUser;
      loaded = true;
      request.user = loginUser;
    },
    logout: async () => {
      await config.logout(request);
      cachedUser = null;
      loaded = true;
      request.user = undefined;
    },
    serializedUser: async () => {
      const currentUser = await user();

      if (!currentUser) {
        return null;
      }

      return config.serializeUser
        ? await config.serializeUser(currentUser)
        : (currentUser as unknown as Serialized);
    },
  } satisfies AuthRuntime<User, Serialized>;

  (request as Request & { auth?: AuthRuntime<User, Serialized> }).auth =
    runtime;
}

function normalizeErrors(
  errors: ValidationErrorInput,
  withAllErrors: boolean,
): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};

  for (const [field, value] of Object.entries(errors)) {
    const messages = Array.isArray(value)
      ? value.flat().map(String)
      : [String(value)];
    normalized[field] = withAllErrors ? messages : (messages[0] ?? "");
  }

  return normalized;
}
