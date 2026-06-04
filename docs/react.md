# React Setup

This adapter uses the official `@inertiajs/react` package. The server sends the same Inertia page object shape the client expects.

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
    return pages[`./Pages/${name}.tsx`].default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

Server route:

```ts
app.get("/users", (_req, res) => {
  void res.inertia("Users/Index", {
    users: [{ id: 1, name: "Ada Lovelace" }],
  });
});
```
