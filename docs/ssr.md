# SSR

SSR uses a separate server process. The main app sends the page object to the SSR server and injects `{ head, body }` into the root view.

Run SSR server:

```sh
inertia-node-ssr --entry dist/ssr.js --host 127.0.0.1 --port 13714
```

Enable SSR in the adapter:

```ts
app.use(
  inertiaMiddleware({
    ssr: {
      enabled: true,
      url: "http://127.0.0.1:13714/render",
      throwOnError: process.env.NODE_ENV === "test",
    },
  }),
);
```

If SSR fails, the adapter falls back to client rendering unless `throwOnError` is enabled.

SSR package requires Node 22+.
