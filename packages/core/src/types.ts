export type HeaderValue = string | string[] | number | undefined;
export type HeadersLike = Record<string, HeaderValue>;
export type MaybePromise<T> = T | Promise<T>;
export type LazyProp<T = unknown> = (context: RenderContext) => MaybePromise<T>;
export type PropSource<T = unknown> = T | LazyProp<T>;
export type PropValue = unknown | LazyProp | InertiaPropWrapper;
export type PageProps = Record<string, unknown>;
export type InputProps = Record<string, PropValue>;
export type VersionValue = string | number | null;

export interface SharedPageProps {
  [key: string]: unknown;
}

export interface ValidationErrorValue {
  value: string;
}

export interface InertiaRequest {
  headers: HeadersLike;
  method: string;
  url: string;
  originalUrl?: string;
  protocol?: string;
  host?: string;
  raw?: unknown;
}

export interface RenderContext {
  request: InertiaRequest;
  component: string;
  url: string;
}

export interface InertiaPage<TProps extends PageProps = PageProps> {
  component: string;
  props: TProps;
  url: string;
  version: VersionValue;
  encryptHistory?: boolean;
  clearHistory?: boolean;
  preserveFragment?: boolean;
  mergeProps?: string[];
  prependProps?: string[];
  deepMergeProps?: string[];
  matchPropsOn?: string[];
  scrollProps?: Record<string, unknown>;
  deferredProps?: Record<string, unknown>;
  rescuedProps?: string[];
  sharedProps?: string[];
  onceProps?: Record<string, unknown>;
}

export interface SsrResult {
  head: string[];
  body: string;
}

export interface SsrOptions {
  enabled?: boolean | ((request: InertiaRequest) => MaybePromise<boolean>);
  url?: string;
  timeoutMs?: number;
  throwOnError?: boolean;
  fetch?: typeof fetch;
}

export interface ProtocolResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface RootViewContext {
  page: string;
  pageObject: InertiaPage;
  rootElementId: string;
  ssr?: SsrResult;
}

export interface CreateInertiaOptions {
  rootView?: string | ((context: RootViewContext) => MaybePromise<string>);
  rootElementId?: string;
  version?:
    | VersionValue
    | ((request: InertiaRequest) => MaybePromise<VersionValue>);
  share?: InputProps | ((context: RenderContext) => MaybePromise<InputProps>);
  resolveUrl?: (request: InertiaRequest) => string;
  ssr?: SsrOptions;
}

export interface RenderOptions {
  status?: number;
  props?: InputProps;
  encryptHistory?: boolean;
  clearHistory?: boolean;
  preserveFragment?: boolean;
  mergeProps?: string[];
  prependProps?: string[];
  deepMergeProps?: string[];
  matchPropsOn?: string[];
  scrollProps?: Record<string, unknown>;
  deferredProps?: Record<string, unknown>;
  rescuedProps?: string[];
  onceProps?: Record<string, unknown>;
  ssr?: boolean;
}

export interface InertiaInstance {
  render(
    request: InertiaRequest,
    component: string,
    props?: InputProps,
    options?: RenderOptions,
  ): Promise<ProtocolResponse>;
  redirect(
    request: InertiaRequest,
    location: string,
    status?: number,
  ): ProtocolResponse;
  location(location: string): ProtocolResponse;
}

export interface DeferredOptions {
  group?: string;
  rescue?: boolean;
}

export interface OnceOptions {
  expiresAt?: number;
}

export interface InertiaPropWrapper<T = unknown> {
  readonly __inertiaProp: true;
  readonly kind: "always" | "optional" | "defer" | "merge";
  readonly value: PropSource<T>;
  readonly defer?: DeferredOptions;
  readonly merge?: MergeMetadata;
}

export interface MergeMetadata {
  mode?: "append" | "prepend" | "deepMerge";
  paths: string[];
  matchOn: string[];
  once?: OnceOptions | true;
}

export type InferPageProps<T> =
  T extends InertiaPage<infer Props> ? Props : never;
export type PageComponentProps<T extends PageProps = PageProps> = T &
  SharedPageProps;
export type ValidationErrors<
  TFields extends string = string,
  TValue = string,
> = Partial<Record<TFields, TValue>>;
export type FlashData<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T;
