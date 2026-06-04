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
} from "@inertia-node/core";
import type { Request, Response } from "express";
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
  NestInertiaOptions,
  NestRenderOptions,
} from "./types.js";
import type { SessionStore } from "@inertia-node/core";

@Injectable()
export class InertiaInterceptor implements NestInterceptor {
  private readonly inertia: InertiaInstance;

  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestInertiaOptions,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {
    this.inertia =
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
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
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
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const sessionStore = prepareInertiaRequest(request, this.options);

    if (isInertiaControllerResult(result)) {
      switch (result.__inertiaNest) {
        case "render":
          await this.sendRender(request, response, sessionStore, result);
          return { handled: true };
        case "redirect":
          this.sendRedirect(request, response, sessionStore, result);
          return { handled: true };
        case "location":
          this.sendLocation(request, response, sessionStore, result);
          return { handled: true };
        case "backWithErrors":
          await this.sendBackWithErrors(
            request,
            response,
            sessionStore,
            result,
          );
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
      this.reflector.get<NestRenderOptions>(
        INERTIA_RENDER_OPTIONS_METADATA,
        context.getHandler(),
      ) ?? {};

    const props =
      result && typeof result === "object" && !Array.isArray(result)
        ? (result as InputProps)
        : {};

    await this.sendRender(request, response, sessionStore, {
      __inertiaNest: "render",
      component,
      props,
      options: decoratorOptions,
    });

    return { handled: true };
  }

  private async sendRender(
    request: Request,
    response: Response,
    sessionStore: SessionStore | undefined,
    result: InertiaRenderResult,
  ): Promise<void> {
    sendProtocolResponse(
      request,
      response,
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
    request: Request,
    response: Response,
    sessionStore: SessionStore | undefined,
    result: InertiaRedirectResult,
  ): void {
    sendProtocolResponse(
      request,
      response,
      sessionStore,
      this.inertia.redirect(
        toInertiaRequest(request),
        result.location,
        result.status,
      ),
    );
  }

  private sendLocation(
    request: Request,
    response: Response,
    sessionStore: SessionStore | undefined,
    result: InertiaLocationResult,
  ): void {
    sendProtocolResponse(
      request,
      response,
      sessionStore,
      this.inertia.location(result.location),
    );
  }

  private async sendBackWithErrors(
    request: Request,
    response: Response,
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

    this.sendRedirect(request, response, sessionStore, {
      __inertiaNest: "redirect",
      location: request.get("Referrer") ?? request.get("Referer") ?? "/",
    });
  }
}
