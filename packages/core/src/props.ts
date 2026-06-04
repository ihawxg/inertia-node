import { parseCommaHeader, requestHeader } from "./headers.js";
import type {
  DeferredOptions,
  InertiaPropWrapper,
  InputProps,
  MergeMetadata,
  OnceOptions,
  PageProps,
  PropSource,
  RenderContext,
} from "./types.js";

export interface ResolvedProps {
  props: PageProps;
  deferredProps?: Record<string, string[]>;
  mergeProps?: string[];
  prependProps?: string[];
  deepMergeProps?: string[];
  matchPropsOn?: string[];
  onceProps?: Record<string, unknown>;
  rescuedProps?: string[];
}

const DEFAULT_DEFERRED_GROUP = "default";

export function always<T>(value: PropSource<T>): InertiaPropWrapper<T> {
  return wrapper("always", value);
}

export function optional<T>(value: PropSource<T>): InertiaPropWrapper<T> {
  return wrapper("optional", value);
}

export function defer<T>(
  value: PropSource<T>,
  options: DeferredOptions = {},
): InertiaPropWrapper<T> {
  return wrapper("defer", value, { defer: options });
}

export interface MergeBuilder<T> extends InertiaPropWrapper<T> {
  append(path?: string): MergeBuilder<T>;
  prepend(path?: string): MergeBuilder<T>;
  deepMerge(path?: string): MergeBuilder<T>;
  matchOn(path: string): MergeBuilder<T>;
  once(options?: OnceOptions): MergeBuilder<T>;
}

export function merge<T>(value: PropSource<T>): MergeBuilder<T> {
  return mergeWrapper(value);
}

export function isInertiaPropWrapper(
  value: unknown,
): value is InertiaPropWrapper {
  return (
    typeof value === "object" &&
    value !== null &&
    "__inertiaProp" in value &&
    value.__inertiaProp === true
  );
}

export function selectPartialProps(
  context: RenderContext,
  props: InputProps,
): InputProps {
  const partialComponent = requestHeader(
    context.request,
    "X-Inertia-Partial-Component",
  );

  if (partialComponent !== context.component) {
    return props;
  }

  const except = parseCommaHeader(
    requestHeader(context.request, "X-Inertia-Partial-Except"),
  );
  if (except.length > 0) {
    return Object.fromEntries(
      Object.entries(props).filter(([key]) => !except.includes(key)),
    );
  }

  const only = parseCommaHeader(
    requestHeader(context.request, "X-Inertia-Partial-Data"),
  );
  if (only.length > 0) {
    return Object.fromEntries(
      Object.entries(props).filter(([key]) => only.includes(key)),
    );
  }

  return props;
}

export async function resolveProps(
  context: RenderContext,
  props: InputProps,
): Promise<PageProps> {
  return (await resolvePageProps(context, props)).props;
}

export async function resolvePageProps(
  context: RenderContext,
  props: InputProps,
): Promise<ResolvedProps> {
  const selected = selectPartialProps(context, props);
  const output: PageProps = {};
  const deferredProps: Record<string, string[]> = {};
  const mergeProps: string[] = [];
  const prependProps: string[] = [];
  const deepMergeProps: string[] = [];
  const matchPropsOn: string[] = [];
  const onceProps: Record<string, unknown> = {};
  const rescuedProps: string[] = [];

  for (const [key, value] of Object.entries(selected)) {
    if (isInertiaPropWrapper(value)) {
      collectMetadata(key, value, {
        deferredProps,
        mergeProps,
        prependProps,
        deepMergeProps,
        matchPropsOn,
        onceProps,
      });

      if (!shouldResolveWrapper(context, key, value)) {
        continue;
      }

      try {
        output[key] = await resolveValue(context, value.value);
      } catch (error) {
        if (value.kind === "defer" && value.defer?.rescue) {
          rescuedProps.push(key);
          continue;
        }

        throw error;
      }

      continue;
    }

    output[key] = await resolveValue(context, value);
  }

  return stripEmpty({
    props: output,
    deferredProps,
    mergeProps,
    prependProps,
    deepMergeProps,
    matchPropsOn,
    onceProps,
    rescuedProps,
  });
}

function wrapper<T>(
  kind: InertiaPropWrapper<T>["kind"],
  value: PropSource<T>,
  options: Partial<InertiaPropWrapper<T>> = {},
): InertiaPropWrapper<T> {
  return {
    __inertiaProp: true,
    kind,
    value,
    ...options,
  };
}

function mergeWrapper<T>(value: PropSource<T>): MergeBuilder<T> {
  const prop = wrapper("merge", value, {
    merge: {
      paths: [""],
      matchOn: [],
    },
  }) as MergeBuilder<T>;

  prop.append = (path = "") => setMergeMode(prop, "append", path);
  prop.prepend = (path = "") => setMergeMode(prop, "prepend", path);
  prop.deepMerge = (path = "") => setMergeMode(prop, "deepMerge", path);
  prop.matchOn = (path: string) => {
    prop.merge?.matchOn.push(path);
    return prop;
  };
  prop.once = (options?: OnceOptions) => {
    if (prop.merge) {
      prop.merge.once = options ?? true;
    }
    return prop;
  };

  return prop;
}

function setMergeMode<T>(
  prop: MergeBuilder<T>,
  mode: NonNullable<MergeMetadata["mode"]>,
  path: string,
): MergeBuilder<T> {
  if (prop.merge) {
    prop.merge.mode = mode;
    prop.merge.paths = [path];
  }

  return prop;
}

async function resolveValue(
  context: RenderContext,
  value: PropSource | unknown,
): Promise<unknown> {
  if (typeof value === "function") {
    return value(context);
  }

  return value;
}

function shouldResolveWrapper(
  context: RenderContext,
  key: string,
  value: InertiaPropWrapper,
): boolean {
  if (value.kind === "always" || value.kind === "merge") {
    return true;
  }

  const partialComponent = requestHeader(
    context.request,
    "X-Inertia-Partial-Component",
  );
  const requestedKeys = parseCommaHeader(
    requestHeader(context.request, "X-Inertia-Partial-Data"),
  );
  const exceptKeys = parseCommaHeader(
    requestHeader(context.request, "X-Inertia-Partial-Except"),
  );
  const partialRequestForComponent = partialComponent === context.component;
  const explicitlyRequested =
    partialRequestForComponent && requestedKeys.includes(key);
  const excepted = partialRequestForComponent && exceptKeys.includes(key);

  if (excepted) {
    return false;
  }

  if (value.kind === "defer" || value.kind === "optional") {
    return explicitlyRequested;
  }

  return true;
}

function collectMetadata(
  key: string,
  value: InertiaPropWrapper,
  metadata: {
    deferredProps: Record<string, string[]>;
    mergeProps: string[];
    prependProps: string[];
    deepMergeProps: string[];
    matchPropsOn: string[];
    onceProps: Record<string, unknown>;
  },
): void {
  if (value.kind === "defer") {
    const group = value.defer?.group ?? DEFAULT_DEFERRED_GROUP;
    metadata.deferredProps[group] ??= [];
    metadata.deferredProps[group].push(key);
  }

  if (value.kind !== "merge" || !value.merge) {
    return;
  }

  const paths = value.merge.paths.map((path) => propPath(key, path));

  if (value.merge.mode === "prepend") {
    metadata.prependProps.push(...paths);
  } else if (value.merge.mode === "deepMerge") {
    metadata.deepMergeProps.push(...paths);
  } else {
    metadata.mergeProps.push(...paths);
  }

  metadata.matchPropsOn.push(
    ...value.merge.matchOn.map((path) => propPath(key, path)),
  );

  if (value.merge.once) {
    metadata.onceProps[key] =
      value.merge.once === true
        ? { prop: key }
        : { prop: key, ...value.merge.once };
  }
}

function propPath(key: string, path: string): string {
  return path ? `${key}.${path}` : key;
}

function stripEmpty<T extends ResolvedProps>(value: T): T {
  const entries = Object.entries(value).filter(([key, entry]) => {
    if (key === "props") {
      return true;
    }

    if (Array.isArray(entry)) {
      return entry.length > 0;
    }

    if (entry && typeof entry === "object") {
      return Object.keys(entry).length > 0;
    }

    return entry !== undefined;
  });

  return Object.fromEntries(entries) as T;
}
