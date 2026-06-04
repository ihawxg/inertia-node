import {
  Inertia,
  inertiaAuth,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  InertiaRenderOptions,
  InertiaService,
  nestExpressSessionAdapter,
  type NestInertiaOptions,
  type NestInertiaRequest,
} from "@inertia-node/nest";
import type { Request } from "express";

interface User {
  id: number;
  name: string;
}

const options: NestInertiaOptions = {
  version: "1",
  session: nestExpressSessionAdapter(),
  auth: inertiaAuth<Request, User, Pick<User, "id">>({
    getUser: () => ({ id: 1, name: "Ada" }),
    login: () => undefined,
    logout: () => undefined,
    serializeUser: (user) => ({ id: user.id }),
  }),
};

InertiaModule.forRoot(options);
InertiaModule.forRootAsync({
  useFactory: () => options,
});

Inertia.render("Home", { user: { id: 1 } });
Inertia.redirect("/dashboard");
Inertia.location("https://example.com");
Inertia.backWithErrors({ email: "Required" });
InertiaRenderOptions({ status: 201 });

void InertiaService;
void InertiaInterceptor;
void InertiaAuthGuard;
void InertiaGuestGuard;

const request = {} as NestInertiaRequest<User>;
void request.auth?.login({ id: 1, name: "Ada" });
