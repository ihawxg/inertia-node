# Prisma Recipe

Prisma can be used with auth hooks without adding Prisma to adapter packages.

```ts
const auth = inertiaAuth({
  getUser: async (req) =>
    req.session.userId
      ? prisma.user.findUnique({ where: { id: req.session.userId } })
      : null,
  login: async (req, user) => {
    req.session.userId = user.id;
  },
  logout: async (req) => {
    delete req.session.userId;
  },
  serializeUser: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }),
});
```
