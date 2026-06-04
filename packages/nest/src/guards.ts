import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { INERTIA_MODULE_OPTIONS } from "./constants.js";
import { prepareInertiaRequest } from "./runtime.js";
import type { NestInertiaOptions } from "./types.js";

@Injectable()
export class InertiaAuthGuard implements CanActivate {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestInertiaOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    prepareInertiaRequest(request, this.options);

    if (request.auth && (await request.auth.check())) {
      request.user = await request.auth.user();
      return true;
    }

    response.redirect(303, this.options.auth?.redirectTo ?? "/login");
    return false;
  }
}

@Injectable()
export class InertiaGuestGuard implements CanActivate {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    private readonly options: NestInertiaOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    prepareInertiaRequest(request, this.options);

    if (request.auth && (await request.auth.check())) {
      response.redirect(303, this.options.auth?.home ?? "/dashboard");
      return false;
    }

    return true;
  }
}
