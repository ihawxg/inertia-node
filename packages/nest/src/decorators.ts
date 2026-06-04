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
  NestRenderOptions,
} from "./types.js";
import type {
  InputProps,
  ValidationErrorInput,
  ValidationErrorOptions,
} from "@inertia-node/core";

function inertiaDecorator(
  component: string,
  options: NestRenderOptions = {},
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
    options: NestRenderOptions = {},
  ): InertiaRenderResult {
    return {
      __inertiaNest: "render",
      component,
      props,
      options,
    };
  },

  redirect(location: string, status?: number): InertiaRedirectResult {
    return {
      __inertiaNest: "redirect",
      location,
      status,
    };
  },

  location(location: string): InertiaLocationResult {
    return {
      __inertiaNest: "location",
      location,
    };
  },

  backWithErrors(
    errors: ValidationErrorInput,
    options: ValidationErrorOptions = {},
  ): InertiaBackWithErrorsResult {
    return {
      __inertiaNest: "backWithErrors",
      errors,
      options,
    };
  },
});

export function InertiaRenderOptions(
  options: NestRenderOptions,
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
    "__inertiaNest" in value &&
    typeof (value as { __inertiaNest?: unknown }).__inertiaNest === "string"
  );
}
