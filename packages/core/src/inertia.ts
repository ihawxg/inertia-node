import { defaultRootView, serializePage } from "./html.js";
import { isInertiaRequest, requestHeader, varyHeader } from "./headers.js";
import { resolvePageProps } from "./props.js";
import {
  type CreateInertiaOptions,
  type InertiaInstance,
  type InertiaPage,
  type InertiaRequest,
  type InputProps,
  type ProtocolResponse,
  type RenderContext,
  type RenderOptions,
  type SsrResult,
  type VersionValue,
} from "./types.js";

export function createInertia(
  options: CreateInertiaOptions = {},
): InertiaInstance {
  const rootElementId = options.rootElementId ?? "app";

  async function resolveVersion(
    request: InertiaRequest,
  ): Promise<VersionValue> {
    if (typeof options.version === "function") {
      return options.version(request);
    }

    return options.version ?? null;
  }

  function resolveUrl(request: InertiaRequest): string {
    return options.resolveUrl?.(request) ?? request.originalUrl ?? request.url;
  }

  async function resolveShared(context: RenderContext): Promise<InputProps> {
    if (typeof options.share === "function") {
      return options.share(context);
    }

    return options.share ?? {};
  }

  async function renderSsr(
    request: InertiaRequest,
    page: InertiaPage,
  ): Promise<SsrResult | undefined> {
    const ssr = options.ssr;

    if (!ssr) {
      return undefined;
    }

    const enabled =
      typeof ssr.enabled === "function"
        ? await ssr.enabled(request)
        : (ssr.enabled ?? true);

    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, ssr.timeoutMs ?? 1500);

    try {
      const fetcher = ssr.fetch ?? fetch;
      const response = await fetcher(
        ssr.url ?? "http://127.0.0.1:13714/render",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(page),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`SSR request failed with status ${response.status}`);
      }

      return (await response.json()) as SsrResult;
    } catch (error) {
      if (ssr.throwOnError) {
        throw error;
      }

      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function renderRootView(
    request: InertiaRequest,
    pageObject: InertiaPage,
    renderOptions: RenderOptions,
  ): Promise<string> {
    const page = serializePage(pageObject);
    const ssr =
      renderOptions.ssr === false
        ? undefined
        : await renderSsr(request, pageObject);

    if (typeof options.rootView === "function") {
      return options.rootView({ page, pageObject, rootElementId, ssr });
    }

    if (typeof options.rootView === "string") {
      return options.rootView
        .replaceAll("{{ page }}", page)
        .replaceAll("{{ rootElementId }}", rootElementId);
    }

    return defaultRootView({ page, pageObject, rootElementId, ssr });
  }

  async function render(
    request: InertiaRequest,
    component: string,
    props: InputProps = {},
    renderOptions: RenderOptions = {},
  ): Promise<ProtocolResponse> {
    const version = await resolveVersion(request);
    const url = resolveUrl(request);

    if (shouldReloadAssets(request, version)) {
      return {
        status: 409,
        headers: {
          "X-Inertia-Location": absoluteUrl(request, url),
          Vary: "X-Inertia",
        },
        body: "",
      };
    }

    const context: RenderContext = { request, component, url };
    const shared = await resolveShared(context);
    const mergedProps = { ...shared, ...props };
    const resolved = await resolvePageProps(context, {
      errors: {},
      ...mergedProps,
    });

    const page: InertiaPage = stripUndefined({
      component,
      props: resolved.props,
      url,
      version,
      encryptHistory: renderOptions.encryptHistory,
      clearHistory: renderOptions.clearHistory,
      preserveFragment: renderOptions.preserveFragment,
      mergeProps: appendMetadata(renderOptions.mergeProps, resolved.mergeProps),
      prependProps: appendMetadata(
        renderOptions.prependProps,
        resolved.prependProps,
      ),
      deepMergeProps: appendMetadata(
        renderOptions.deepMergeProps,
        resolved.deepMergeProps,
      ),
      matchPropsOn: appendMetadata(
        renderOptions.matchPropsOn,
        resolved.matchPropsOn,
      ),
      scrollProps: renderOptions.scrollProps,
      deferredProps: {
        ...resolved.deferredProps,
        ...renderOptions.deferredProps,
      },
      rescuedProps: appendMetadata(
        renderOptions.rescuedProps,
        resolved.rescuedProps,
      ),
      onceProps: {
        ...resolved.onceProps,
        ...renderOptions.onceProps,
      },
      sharedProps: Object.keys(shared),
    });

    if (isInertiaRequest(request)) {
      return {
        status: renderOptions.status ?? 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Inertia": "true",
          Vary: "X-Inertia",
        },
        body: JSON.stringify(page),
      };
    }

    return {
      status: renderOptions.status ?? 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        Vary: "X-Inertia",
      },
      body: await renderRootView(request, page, renderOptions),
    };
  }

  return {
    render,
    redirect,
    location,
  };
}

function shouldReloadAssets(
  request: InertiaRequest,
  version: VersionValue,
): boolean {
  if (!isInertiaRequest(request) || request.method.toUpperCase() !== "GET") {
    return false;
  }

  const clientVersion = requestHeader(request, "X-Inertia-Version");
  return clientVersion !== undefined && String(version) !== clientVersion;
}

function redirect(
  request: InertiaRequest,
  location: string,
  status = defaultRedirectStatus(request),
): ProtocolResponse {
  return {
    status,
    headers: {
      Location: location,
      Vary: varyHeader(undefined),
    },
    body: "",
  };
}

function location(location: string): ProtocolResponse {
  return {
    status: 409,
    headers: {
      "X-Inertia-Location": location,
      Vary: "X-Inertia",
    },
    body: "",
  };
}

function defaultRedirectStatus(request: InertiaRequest): number {
  return request.method.toUpperCase() === "GET" ? 302 : 303;
}

function absoluteUrl(request: InertiaRequest, url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const host = request.host ?? requestHeader(request, "Host");
  if (!host) {
    return url;
  }

  const protocol = request.protocol ?? "http";
  return `${protocol}://${host}${url.startsWith("/") ? url : `/${url}`}`;
}

function appendMetadata<T>(left?: T[], right?: T[]): T[] | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];
  return merged.length > 0 ? merged : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => {
      if (entry === undefined) {
        return false;
      }

      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      if (
        key !== "props" &&
        entry &&
        typeof entry === "object" &&
        Object.keys(entry).length === 0
      ) {
        return false;
      }

      return true;
    }),
  ) as T;
}
