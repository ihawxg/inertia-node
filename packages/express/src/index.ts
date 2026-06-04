import {
  always,
  createInertia,
  validationError,
  type AuthConfig,
  type AuthRuntime,
  type CreateInertiaOptions,
  type InertiaInstance,
  type InertiaRequest,
  type InputProps,
  type ProtocolResponse,
  type RenderOptions,
  type SessionStore,
  type ValidationErrorInput,
  type ValidationErrorOptions,
  type ValidationErrorPayload,
} from "@inertia-node/core";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface ExpressInertiaOptions extends CreateInertiaOptions {
  instance?: InertiaInstance;
  session?: (request: Request) => SessionStore | undefined;
  auth?: AuthConfig<Request, any, any>;
  withAllErrors?: boolean;
}

export type ExpressRenderOptions = RenderOptions;

export type AuthenticatedRequest<User> = Request & {
  user: User;
  auth: AuthRuntime<User>;
};

declare module "express-serve-static-core" {
  interface Response {
    inertia(
      component: string,
      props?: InputProps,
      options?: ExpressRenderOptions,
    ): Promise<void>;
    inertiaRedirect(location: string, status?: number): void;
    inertiaLocation(location: string): void;
    backWithErrors(
      errors: ValidationErrorInput,
      options?: ValidationErrorOptions,
    ): Promise<void>;
  }

  interface Request {
    user?: unknown;
    auth?: AuthRuntime<unknown>;
    flash(key: string, value: unknown): Promise<void>;
  }
}

export function inertiaMiddleware(
  options: ExpressInertiaOptions = {},
): RequestHandler {
  const inertia =
    options.instance ??
    createInertia({
      ...options,
      share: async (context) => {
        const request = context.request.raw as Request | undefined;
        const sessionStore = request ? options.session?.(request) : undefined;
        const userShare = await resolveUserShare(options, context);
        const baseShare =
          typeof options.share === "function"
            ? await options.share(context)
            : (options.share ?? {});

        return {
          errors: always(
            sessionStore
              ? await pullErrors(sessionStore, request, options.withAllErrors)
              : {},
          ),
          flash: always(
            sessionStore ? ((await sessionStore.pull("flash")) ?? {}) : {},
          ),
          ...userShare,
          ...baseShare,
        };
      },
    });

  return (request: Request, response: Response, next: NextFunction) => {
    const sessionStore = options.session?.(request);

    request.flash = async (key: string, value: unknown) => {
      await sessionStore?.flash("flash", {
        ...((await sessionStore.get<Record<string, unknown>>("flash")) ?? {}),
        [key]: value,
      });
    };

    if (options.auth) {
      installAuth(request, options.auth);
    }

    response.inertia = async (
      component: string,
      props: InputProps = {},
      renderOptions: ExpressRenderOptions = {},
    ) => {
      sendProtocolResponse(
        request,
        response,
        sessionStore,
        await inertia.render(
          toInertiaRequest(response.req),
          component,
          props,
          renderOptions,
        ),
      );
    };

    response.inertiaRedirect = (location: string, status?: number) => {
      sendProtocolResponse(
        request,
        response,
        sessionStore,
        inertia.redirect(toInertiaRequest(response.req), location, status),
      );
    };

    response.inertiaLocation = (location: string) => {
      sendProtocolResponse(
        request,
        response,
        sessionStore,
        inertia.location(location),
      );
    };

    response.backWithErrors = async (
      errors: ValidationErrorInput,
      validationOptions: ValidationErrorOptions = {},
    ) => {
      if (!sessionStore) {
        throw new Error("backWithErrors requires a configured session adapter");
      }

      const payload = validationError(errors, {
        bag:
          validationOptions.bag ??
          (typeof request.headers["x-inertia-error-bag"] === "string"
            ? request.headers["x-inertia-error-bag"]
            : undefined),
      });

      await flashErrors(sessionStore, payload, options.withAllErrors);
      response.inertiaRedirect(
        request.get("Referrer") ?? request.get("Referer") ?? "/",
      );
    };

    next();
  };
}

export function expressSessionAdapter(): (
  request: Request,
) => SessionStore | undefined {
  return (request: Request) => {
    const session = (request as Request & { session?: Record<string, any> })
      .session;

    if (!session) {
      return undefined;
    }

    return {
      get: <T = unknown>(key: string) => session[key] as T | undefined,
      set: <T = unknown>(key: string, value: T) => {
        session[key] = value;
      },
      pull: <T = unknown>(key: string) => {
        const value = session[key] as T | undefined;
        delete session[key];
        return value;
      },
      flash: <T = unknown>(key: string, value: T) => {
        session[key] = value;
      },
      reflash: () => {
        // express-session keeps values until explicitly pulled, so this adapter
        // only needs a hook point for stores with aging flash semantics.
      },
    };
  };
}

export function requireAuth<User = unknown>(
  redirectTo?: string,
): RequestHandler {
  return async (request, response, next) => {
    const auth = request.auth as AuthRuntime<User> | undefined;

    if (auth && (await auth.check())) {
      request.user = await auth.user();
      next();
      return;
    }

    response.redirect(303, redirectTo ?? "/login");
  };
}

export function guestOnly(home = "/dashboard"): RequestHandler {
  return async (request, response, next) => {
    if (request.auth && (await request.auth.check())) {
      response.redirect(303, home);
      return;
    }

    next();
  };
}

function sendProtocolResponse(
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

function toInertiaRequest(request: Request) {
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

async function resolveUserShare(
  options: ExpressInertiaOptions,
  context: { request: InertiaRequest },
): Promise<InputProps> {
  const request = context.request.raw as Request | undefined;

  if (!request || !options.auth) {
    return {};
  }

  if (!request.auth) {
    installAuth(request, options.auth);
  }

  return {
    auth: always({
      user: await request.auth?.serializedUser(),
    }),
  };
}

function installAuth<User, Serialized>(
  request: Request,
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

  request.auth = {
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
}

async function flashErrors(
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

async function pullErrors(
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

export {
  always,
  createInertia,
  defer,
  inertiaAuth,
  merge,
  optional,
  validationError,
} from "@inertia-node/core";
export type {
  AuthConfig,
  AuthRuntime,
  CreateInertiaOptions,
  InertiaInstance,
  InputProps,
  ProtocolResponse,
  RenderOptions,
  SessionStore,
  ValidationErrorInput,
  ValidationErrorOptions,
  ValidationErrorPayload,
} from "@inertia-node/core";
