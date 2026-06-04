import type { InertiaPage, RootViewContext } from "./types.js";

export function serializePage(page: InertiaPage): string {
  return JSON.stringify(page).replace(/</g, "\\u003c");
}

export function defaultRootView(context: RootViewContext): string {
  const head = context.ssr?.head.join("\n") ?? "";
  const body = context.ssr?.body ?? "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${head}
  </head>
  <body>
    <script data-page="app" type="application/json">${context.page}</script>
    <div id="${escapeAttribute(context.rootElementId)}">${body}</div>
  </body>
</html>`;
}

export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
