export { Inertia, InertiaRenderOptions } from "./decorators.js";
export { InertiaAuthGuard, InertiaGuestGuard } from "./guards.js";
export { InertiaInterceptor } from "./interceptor.js";
export { InertiaModule } from "./module.js";
export { nestExpressSessionAdapter } from "./session.js";
export { InertiaService } from "./service.js";
export type {
  InertiaBackWithErrorsResult,
  InertiaControllerResult,
  InertiaLocationResult,
  InertiaRedirectResult,
  InertiaRenderResult,
  NestInertiaAsyncOptions,
  NestInertiaOptions,
  NestInertiaOptionsFactory,
  NestRenderOptions,
} from "./types.js";
export type { NestInertiaRequest } from "./runtime.js";
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
