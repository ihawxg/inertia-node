export { createInertia } from "./inertia.js";
export {
  getHeader,
  isInertiaRequest,
  parseCommaHeader,
  requestHeader,
  varyHeader,
} from "./headers.js";
export { defaultRootView, escapeAttribute, serializePage } from "./html.js";
export { inertiaAuth } from "./auth.js";
export {
  always,
  defer,
  isInertiaPropWrapper,
  merge,
  optional,
  resolvePageProps,
  resolveProps,
  selectPartialProps,
} from "./props.js";
export { validationError } from "./session.js";
export type { AuthConfig, AuthRuntime } from "./auth.js";
export type {
  SessionStore,
  ValidationErrorInput,
  ValidationErrorOptions,
  ValidationErrorPayload,
} from "./session.js";
export type {
  CreateInertiaOptions,
  DeferredOptions,
  HeaderValue,
  HeadersLike,
  InertiaInstance,
  InertiaPage,
  InertiaPropWrapper,
  InertiaRequest,
  InputProps,
  LazyProp,
  MaybePromise,
  MergeMetadata,
  OnceOptions,
  PageProps,
  PropSource,
  PropValue,
  ProtocolResponse,
  RenderContext,
  RenderOptions,
  RootViewContext,
  SsrOptions,
  SsrResult,
  FlashData,
  InferPageProps,
  PageComponentProps,
  ValidationErrors,
  ValidationErrorValue,
  VersionValue,
} from "./types.js";
