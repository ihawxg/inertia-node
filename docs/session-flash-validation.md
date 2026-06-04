# Sessions, Flash, And Validation

Use `express-session` plus `expressSessionAdapter()`.

```ts
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(inertiaMiddleware({ session: expressSessionAdapter() }));
```

## Flash

```ts
app.post("/users", async (req, res) => {
  await req.flash("success", "User created");
  res.inertiaRedirect("/users");
});
```

Flash data is shared once as:

```ts
props.flash.success;
```

## Validation

Validation follows Inertia behavior: redirect back, then expose errors as props. Do not return `422` for Inertia form validation.

```ts
app.post("/users", async (_req, res) => {
  await res.backWithErrors({
    email: ["Email is required", "Email must be valid"],
  });
});
```

By default, only the first error per field is shared:

```json
{ "email": "Email is required" }
```

Use `withAllErrors: true` on `inertiaMiddleware()` to share arrays.

## Error Bags

```ts
await res.backWithErrors({ name: "Required" }, { bag: "profile" });
```
