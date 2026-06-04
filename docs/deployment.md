# Deployment

Build packages before publishing or deploying examples:

```sh
pnpm build
```

For applications:

- run the Node server behind a reverse proxy
- configure a production session store for `express-session`
- set `version` to an asset hash or build id
- run the SSR server as a separate process when SSR is enabled
- set `ssr.throwOnError` to `false` in production unless you want SSR failures to fail requests

Recommended process layout:

```txt
web: node dist/server.js
ssr: inertia-node-ssr --entry dist/ssr.js --host 127.0.0.1 --port 13714
```
