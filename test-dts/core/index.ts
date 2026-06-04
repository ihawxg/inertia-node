import {
  always,
  createInertia,
  defer,
  merge,
  optional,
  type InertiaPage,
  type PageComponentProps,
  type ValidationErrors,
} from "@inertia-node/core";

declare module "@inertia-node/core" {
  interface SharedPageProps {
    auth: {
      user: { id: number; name: string } | null;
    };
  }
}

const inertia = createInertia({
  version: "1",
  share: {
    appName: "Example",
  },
});

await inertia.render({ headers: {}, method: "GET", url: "/" }, "Home", {
  eager: always("yes"),
  optional: optional(() => "on demand"),
  stats: defer(() => ({ users: 1 })),
  feed: merge(() => ({ data: [{ id: 1 }] }))
    .append("data")
    .matchOn("data.id"),
});

type Page = InertiaPage<{ message: string }>;
type Props = PageComponentProps<Page["props"]>;
type Errors = ValidationErrors<"email" | "password">;

const props: Props = {
  message: "hello",
  auth: { user: null },
};
const errors: Errors = { email: "Required" };

void props;
void errors;
