import { Inject, Injectable } from "@nestjs/common";
import type {
  InputProps,
  ValidationErrorInput,
  ValidationErrorOptions,
} from "@inertia-node/core";
import { INERTIA_MODULE_OPTIONS } from "./constants.js";
import { Inertia } from "./decorators.js";
import type { NestInertiaOptions, NestRenderOptions } from "./types.js";

@Injectable()
export class InertiaService {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS)
    readonly options: NestInertiaOptions,
  ) {}

  render(
    component: string,
    props: InputProps = {},
    options: NestRenderOptions = {},
  ) {
    return Inertia.render(component, props, options);
  }

  redirect(location: string, status?: number) {
    return Inertia.redirect(location, status);
  }

  location(location: string) {
    return Inertia.location(location);
  }

  backWithErrors(
    errors: ValidationErrorInput,
    options: ValidationErrorOptions = {},
  ) {
    return Inertia.backWithErrors(errors, options);
  }
}
