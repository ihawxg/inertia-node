import type {
  AuthConfig,
  CreateInertiaOptions,
  InertiaInstance,
  InputProps,
  RenderOptions,
  SessionStore,
  ValidationErrorInput,
  ValidationErrorOptions,
} from "@inertia-node/core";
import type { ModuleMetadata, Type } from "@nestjs/common";
import type { Request } from "express";

export interface NestInertiaOptions extends CreateInertiaOptions {
  instance?: InertiaInstance;
  session?: (request: Request) => SessionStore | undefined;
  auth?: AuthConfig<Request, any, any>;
  withAllErrors?: boolean;
}

export type NestRenderOptions = RenderOptions;

export interface NestInertiaOptionsFactory {
  createInertiaOptions(): Promise<NestInertiaOptions> | NestInertiaOptions;
}

export interface NestInertiaAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  inject?: any[];
  useExisting?: Type<NestInertiaOptionsFactory>;
  useClass?: Type<NestInertiaOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<NestInertiaOptions> | NestInertiaOptions;
}

export type InertiaControllerResult =
  | InertiaRenderResult
  | InertiaRedirectResult
  | InertiaLocationResult
  | InertiaBackWithErrorsResult;

export interface InertiaRenderResult {
  readonly __inertiaNest: "render";
  component: string;
  props?: InputProps;
  options?: NestRenderOptions;
}

export interface InertiaRedirectResult {
  readonly __inertiaNest: "redirect";
  location: string;
  status?: number;
}

export interface InertiaLocationResult {
  readonly __inertiaNest: "location";
  location: string;
}

export interface InertiaBackWithErrorsResult {
  readonly __inertiaNest: "backWithErrors";
  errors: ValidationErrorInput;
  options?: ValidationErrorOptions;
}
