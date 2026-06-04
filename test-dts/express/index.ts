import express from "express";
import session from "express-session";
import {
  expressSessionAdapter,
  inertiaAuth,
  inertiaMiddleware,
  requireAuth,
  type AuthenticatedRequest,
} from "@inertia-node/express";

interface User {
  id: number;
  email: string;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const app = express();

app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(
  inertiaMiddleware({
    session: expressSessionAdapter(),
    auth: inertiaAuth<express.Request, User, Pick<User, "id" | "email">>({
      getUser: async (req) =>
        req.session.userId
          ? { id: req.session.userId, email: "a@example.test" }
          : null,
      login: async (req, user) => {
        req.session.userId = user.id;
      },
      logout: async (req) => {
        delete req.session.userId;
      },
      serializeUser: (user) => ({ id: user.id, email: user.email }),
    }),
  }),
);

app.get("/dashboard", requireAuth<User>(), async (req, res) => {
  const authed = req as AuthenticatedRequest<User>;
  const user = await authed.auth.user();
  await req.flash("success", "Saved");
  return res.inertia("Dashboard", { user });
});

app.post("/users", async (_req, res) => {
  return res.backWithErrors({ email: ["Required"] }, { bag: "createUser" });
});
