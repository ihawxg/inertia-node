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
import type { FastifyReply, FastifyRequest } from "fastify";
import type { NestFastifyInertiaOptions } from "./types.js";

export type NestFastifyInertiaRequest<User = unknown> = FastifyRequest & {
  user?: User;
  auth?: AuthRuntime<User>;
  flash(key: string, value: unknown): Promise<void>;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: unknown;
    auth?: AuthRuntime<unknown>;
    flash(key: string, value: unknown): Promise<void>;
  }
}

export function prepareInertiaRequest(
  request: FastifyRequest,
  options: NestFastifyInertiaOptions,
): SessionStore | undefined {
  const sessionStore = options.session?.(request);
  const inertiaRequest = request as NestFastifyInertiaRequest;

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
  request: FastifyRequest,
  reply: FastifyReply,
  sessionStore: SessionStore | undefined,
  protocol: ProtocolResponse,
): void {
  if (protocol.status === 409) {
    void sessionStore?.reflash();
    void (
      request as FastifyRequest & { session?: { save?: () => unknown } }
    ).session?.save?.();
  }

  reply.code(protocol.status);

  for (const [name, value] of Object.entries(protocol.headers)) {
    reply.header(name, value);
  }

  reply.send(protocol.body);
}

export function toInertiaRequest(request: FastifyRequest): InertiaRequest {
  const host = request.headers.host;

  return {
    headers: request.headers,
    method: request.method,
    url: request.url,
    originalUrl: request.url,
    host: Array.isArray(host) ? host[0] : host,
    raw: request,
  };
}

export async function resolveUserShare(
  options: NestFastifyInertiaOptions,
  context: { request: InertiaRequest },
): Promise<InputProps> {
  const request = context.request.raw as FastifyRequest | undefined;

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
  request?: FastifyRequest,
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
  request: FastifyRequest,
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
  request: NestFastifyInertiaRequest<User>,
  config: AuthConfig<FastifyRequest, User, Serialized>,
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

  (request as FastifyRequest & { auth?: AuthRuntime<User, Serialized> }).auth =
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
