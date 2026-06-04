import {
  createSsrServer,
  loadRenderer,
  type SsrRenderFunction,
} from "@inertia-node/ssr";

const render: SsrRenderFunction = (page) => ({
  head: [`<title>${page.component}</title>`],
  body: `<main>${page.component}</main>`,
});

await loadRenderer("/tmp/entry.mjs").catch(() => undefined);
await createSsrServer({ entry: "/tmp/entry.mjs" }).catch(() => undefined);

void render;
