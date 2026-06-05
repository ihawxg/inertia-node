import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { INERTIA_MODULE_OPTIONS } from "./constants.js";
import { prepareInertiaRequest } from "./runtime.js";
import type { NestFastifyInertiaOptions } from "./types.js";

@Injectable()
export class InertiaAuthGuard implements CanActivate {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestFastifyInertiaOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    prepareInertiaRequest(request, this.options);

    if (request.auth && (await request.auth.check())) {
      request.user = await request.auth.user();
      return true;
    }

    reply.code(303).redirect(this.options.auth?.redirectTo ?? "/login");
    return false;
  }
}

@Injectable()
export class InertiaGuestGuard implements CanActivate {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestFastifyInertiaOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    prepareInertiaRequest(request, this.options);

    if (request.auth && (await request.auth.check())) {
      reply.code(303).redirect(this.options.auth?.home ?? "/dashboard");
      return false;
    }

    return true;
  }
}
