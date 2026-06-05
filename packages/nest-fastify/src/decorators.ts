import { SetMetadata } from "@nestjs/common";
import {
  INERTIA_COMPONENT_METADATA,
  INERTIA_RENDER_OPTIONS_METADATA,
} from "./constants.js";
import type {
  InertiaBackWithErrorsResult,
  InertiaLocationResult,
  InertiaRedirectResult,
  InertiaRenderResult,
  NestFastifyRenderOptions,
} from "./types.js";
import type {
  InputProps,
  ValidationErrorInput,
  ValidationErrorOptions,
} from "@inertia-node/core";

function inertiaDecorator(
  component: string,
  options: NestFastifyRenderOptions = {},
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    SetMetadata(INERTIA_COMPONENT_METADATA, component)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(INERTIA_RENDER_OPTIONS_METADATA, options)(
      target,
      propertyKey,
      descriptor,
    );
  };
}

export const Inertia = Object.assign(inertiaDecorator, {
  render(
    component: string,
    props: InputProps = {},
    options: NestFastifyRenderOptions = {},
  ): InertiaRenderResult {
    return {
      __inertiaNestFastify: "render",
      component,
      props,
      options,
    };
  },

  redirect(location: string, status?: number): InertiaRedirectResult {
    return {
      __inertiaNestFastify: "redirect",
      location,
      status,
    };
  },

  location(location: string): InertiaLocationResult {
    return {
      __inertiaNestFastify: "location",
      location,
    };
  },

  backWithErrors(
    errors: ValidationErrorInput,
    options: ValidationErrorOptions = {},
  ): InertiaBackWithErrorsResult {
    return {
      __inertiaNestFastify: "backWithErrors",
      errors,
      options,
    };
  },
});

export function InertiaRenderOptions(
  options: NestFastifyRenderOptions,
): MethodDecorator {
  return SetMetadata(INERTIA_RENDER_OPTIONS_METADATA, options);
}

export function isInertiaControllerResult(
  value: unknown,
): value is
  | InertiaRenderResult
  | InertiaRedirectResult
  | InertiaLocationResult
  | InertiaBackWithErrorsResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "__inertiaNestFastify" in value &&
    typeof (value as { __inertiaNestFastify?: unknown })
      .__inertiaNestFastify === "string"
  );
}
