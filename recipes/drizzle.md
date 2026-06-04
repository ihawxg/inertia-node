# Drizzle Recipe

Drizzle can be used with auth hooks without adding Drizzle to adapter packages.

```ts
const auth = inertiaAuth({
  getUser: async (req) => {
    if (!req.session.userId) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));
    return user ?? null;
  },
  login: async (req, user) => {
    req.session.userId = user.id;
  },
  logout: async (req) => {
    delete req.session.userId;
  },
});
```
