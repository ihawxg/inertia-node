import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  always,
  createInertia,
  type InertiaInstance,
  type InputProps,
  type SessionStore,
} from "@inertia-node/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { mergeMap, type Observable } from "rxjs";
import {
  INERTIA_COMPONENT_METADATA,
  INERTIA_MODULE_OPTIONS,
  INERTIA_RENDER_OPTIONS_METADATA,
} from "./constants.js";
import { isInertiaControllerResult } from "./decorators.js";
import {
  flashErrors,
  prepareInertiaRequest,
  pullErrors,
  resolveUserShare,
  sendProtocolResponse,
  toInertiaRequest,
  validationPayloadForRequest,
} from "./runtime.js";
import type {
  InertiaBackWithErrorsResult,
  InertiaLocationResult,
  InertiaRedirectResult,
  InertiaRenderResult,
  NestFastifyInertiaOptions,
  NestFastifyRenderOptions,
} from "./types.js";

@Injectable()
export class InertiaInterceptor implements NestInterceptor {
  private readonly inertia: InertiaInstance;

  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestFastifyInertiaOptions,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {
    this.inertia =
      options.instance ??
      createInertia({
        ...options,
        share: async (context) => {
          const request = context.request.raw as FastifyRequest | undefined;
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
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    prepareInertiaRequest(request, this.options);

    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        const handled = await this.handleResult(context, result);
        return handled.handled ? undefined : result;
      }),
    );
  }

  private async handleResult(
    context: ExecutionContext,
    result: unknown,
  ): Promise<{ handled: boolean }> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const sessionStore = prepareInertiaRequest(request, this.options);

    if (isInertiaControllerResult(result)) {
      switch (result.__inertiaNestFastify) {
        case "render":
          await this.sendRender(request, reply, sessionStore, result);
          return { handled: true };
        case "redirect":
          this.sendRedirect(request, reply, sessionStore, result);
          return { handled: true };
        case "location":
          this.sendLocation(reply, result);
          return { handled: true };
        case "backWithErrors":
          await this.sendBackWithErrors(request, reply, sessionStore, result);
          return { handled: true };
      }
    }

    const component = this.reflector.get<string>(
      INERTIA_COMPONENT_METADATA,
      context.getHandler(),
    );

    if (!component) {
      return { handled: false };
    }

    const decoratorOptions =
      this.reflector.get<NestFastifyRenderOptions>(
        INERTIA_RENDER_OPTIONS_METADATA,
        context.getHandler(),
      ) ?? {};

    const props =
      result && typeof result === "object" && !Array.isArray(result)
        ? (result as InputProps)
        : {};

    await this.sendRender(request, reply, sessionStore, {
      __inertiaNestFastify: "render",
      component,
      props,
      options: decoratorOptions,
    });

    return { handled: true };
  }

  private async sendRender(
    request: FastifyRequest,
    reply: FastifyReply,
    sessionStore: SessionStore | undefined,
    result: InertiaRenderResult,
  ): Promise<void> {
    sendProtocolResponse(
      request,
      reply,
      sessionStore,
      await this.inertia.render(
        toInertiaRequest(request),
        result.component,
        result.props,
        result.options,
      ),
    );
  }

  private sendRedirect(
    request: FastifyRequest,
    reply: FastifyReply,
    sessionStore: SessionStore | undefined,
    result: InertiaRedirectResult,
  ): void {
    sendProtocolResponse(
      request,
      reply,
      sessionStore,
      this.inertia.redirect(
        toInertiaRequest(request),
        result.location,
        result.status,
      ),
    );
  }

  private sendLocation(
    reply: FastifyReply,
    result: InertiaLocationResult,
  ): void {
    sendProtocolResponse(
      reply.request,
      reply,
      undefined,
      this.inertia.location(result.location),
    );
  }

  private async sendBackWithErrors(
    request: FastifyRequest,
    reply: FastifyReply,
    sessionStore: SessionStore | undefined,
    result: InertiaBackWithErrorsResult,
  ): Promise<void> {
    if (!sessionStore) {
      throw new Error("backWithErrors requires a configured session adapter");
    }

    await flashErrors(
      sessionStore,
      validationPayloadForRequest(request, result.errors, result.options),
      this.options.withAllErrors,
    );

    this.sendRedirect(request, reply, sessionStore, {
      __inertiaNestFastify: "redirect",
      location:
        firstHeader(request.headers.referrer) ??
        firstHeader(request.headers.referer) ??
        "/",
    });
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
