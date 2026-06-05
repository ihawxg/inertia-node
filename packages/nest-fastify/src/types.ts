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
import type { FastifyRequest } from "fastify";

export interface NestFastifyInertiaOptions extends CreateInertiaOptions {
  instance?: InertiaInstance;
  session?: (request: FastifyRequest) => SessionStore | undefined;
  auth?: AuthConfig<FastifyRequest, any, any>;
  withAllErrors?: boolean;
}

export type NestFastifyRenderOptions = RenderOptions;

export interface NestFastifyInertiaOptionsFactory {
  createInertiaOptions():
    | Promise<NestFastifyInertiaOptions>
    | NestFastifyInertiaOptions;
}

export interface NestFastifyInertiaAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  inject?: any[];
  useExisting?: Type<NestFastifyInertiaOptionsFactory>;
  useClass?: Type<NestFastifyInertiaOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<NestFastifyInertiaOptions> | NestFastifyInertiaOptions;
}

export type InertiaControllerResult =
  | InertiaRenderResult
  | InertiaRedirectResult
  | InertiaLocationResult
  | InertiaBackWithErrorsResult;

export interface InertiaRenderResult {
  readonly __inertiaNestFastify: "render";
  component: string;
  props?: InputProps;
  options?: NestFastifyRenderOptions;
}

export interface InertiaRedirectResult {
  readonly __inertiaNestFastify: "redirect";
  location: string;
  status?: number;
}

export interface InertiaLocationResult {
  readonly __inertiaNestFastify: "location";
  location: string;
}

export interface InertiaBackWithErrorsResult {
  readonly __inertiaNestFastify: "backWithErrors";
  errors: ValidationErrorInput;
  options?: ValidationErrorOptions;
}
