import {
  fastifySessionAdapter,
  Inertia,
  inertiaAuth,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  InertiaRenderOptions,
  InertiaService,
  type NestFastifyInertiaOptions,
  type NestFastifyInertiaRequest,
} from "@inertia-node/nest-fastify";
import type { FastifyRequest } from "fastify";

interface User {
  id: number;
  name: string;
}

const options: NestFastifyInertiaOptions = {
  version: "1",
  session: fastifySessionAdapter(),
  auth: inertiaAuth<FastifyRequest, User, Pick<User, "id">>({
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

const request = {} as NestFastifyInertiaRequest<User>;
void request.auth?.login({ id: 1, name: "Ada" });
