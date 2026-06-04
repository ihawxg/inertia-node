import { createInertiaApp } from "@inertiajs/react";
import createServer from "@inertiajs/react/server";
import React from "react";
import { renderToString } from "react-dom/server";

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    resolve: (name: string) => {
      const pages = import.meta.glob<{ default: React.ComponentType<any> }>(
        "./Pages/**/*.tsx",
        { eager: true },
      );
      const resolved = pages[`./Pages/${name}.tsx`];

      if (!resolved) {
        throw new Error(`Page not found: ${name}`);
      }

      return resolved.default;
    },
    setup: ({ App, props }: any) => <App {...props} />,
  }),
);
