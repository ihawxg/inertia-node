import type { HeadersLike, InertiaRequest } from "./types.js";

export function getHeader(
  headers: HeadersLike,
  name: string,
): string | undefined {
  const wanted = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      return value[0];
    }

    return String(value);
  }

  return undefined;
}

export function requestHeader(
  request: InertiaRequest,
  name: string,
): string | undefined {
  return getHeader(request.headers, name);
}

export function isInertiaRequest(request: InertiaRequest): boolean {
  return requestHeader(request, "X-Inertia") === "true";
}

export function varyHeader(value?: string, addition = "X-Inertia"): string {
  if (!value) {
    return addition;
  }

  const parts = value.split(",").map((part) => part.trim().toLowerCase());
  return parts.includes(addition.toLowerCase())
    ? value
    : `${value}, ${addition}`;
}

export function parseCommaHeader(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
