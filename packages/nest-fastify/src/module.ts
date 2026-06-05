import { DynamicModule, Module, Provider, type Type } from "@nestjs/common";
import { INERTIA_MODULE_OPTIONS } from "./constants.js";
import { InertiaAuthGuard, InertiaGuestGuard } from "./guards.js";
import { InertiaInterceptor } from "./interceptor.js";
import { InertiaService } from "./service.js";
import type {
  NestFastifyInertiaAsyncOptions,
  NestFastifyInertiaOptions,
  NestFastifyInertiaOptionsFactory,
} from "./types.js";

@Module({})
export class InertiaModule {
  static forRoot(options: NestFastifyInertiaOptions = {}): DynamicModule {
    return {
      module: InertiaModule,
      providers: [
        { provide: INERTIA_MODULE_OPTIONS, useValue: options },
        InertiaService,
        InertiaInterceptor,
        InertiaAuthGuard,
        InertiaGuestGuard,
      ],
      exports: [
        INERTIA_MODULE_OPTIONS,
        InertiaService,
        InertiaInterceptor,
        InertiaAuthGuard,
        InertiaGuestGuard,
      ],
    };
  }

  static forRootAsync(options: NestFastifyInertiaAsyncOptions): DynamicModule {
    return {
      module: InertiaModule,
      imports: options.imports,
      providers: [
        ...createAsyncProviders(options),
        InertiaService,
        InertiaInterceptor,
        InertiaAuthGuard,
        InertiaGuestGuard,
      ],
      exports: [
        INERTIA_MODULE_OPTIONS,
        InertiaService,
        InertiaInterceptor,
        InertiaAuthGuard,
        InertiaGuestGuard,
      ],
    };
  }
}

function createAsyncProviders(
  options: NestFastifyInertiaAsyncOptions,
): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: INERTIA_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  const useClass = options.useClass ?? options.useExisting;

  if (!useClass) {
    throw new Error(
      "InertiaModule.forRootAsync requires useFactory, useClass, or useExisting.",
    );
  }

  const providers: Provider[] = [
    {
      provide: INERTIA_MODULE_OPTIONS,
      useFactory: async (factory: NestFastifyInertiaOptionsFactory) =>
        factory.createInertiaOptions(),
      inject: [useClass],
    },
  ];

  if (options.useClass) {
    providers.push({
      provide: useClass,
      useClass: useClass as Type<NestFastifyInertiaOptionsFactory>,
    });
  }

  return providers;
}
