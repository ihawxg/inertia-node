# Auth Hooks

Auth is hook-based. The adapter does not choose a database, ORM, password hashing library, or OAuth provider.

```ts
app.use(
  inertiaMiddleware({
    auth: inertiaAuth({
      getUser: async (req) =>
        req.session.userId ? db.users.find(req.session.userId) : null,
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
    }),
  }),
);
```

Available helpers:

- `req.auth.user()`
- `req.auth.check()`
- `req.auth.login(user)`
- `req.auth.logout()`
- `req.user`
- `requireAuth()`
- `guestOnly()`

Shared page prop:

```ts
props.auth.user;
```
