import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import "./style.css";

createInertiaApp({
  resolve: (name: string) => {
    const pages = import.meta.glob<{ default: unknown }>("./Pages/**/*.tsx", {
      eager: true,
    });
    const page = pages[`./Pages/${name}.tsx`];

    if (!page || typeof page !== "object" || !("default" in page)) {
      throw new Error(`Page not found: ${name}`);
    }

    return page.default;
  },
  setup({ el, App, props }: any) {
    createRoot(el).render(<App {...props} />);
  },
});
