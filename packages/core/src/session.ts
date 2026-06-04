import type { MaybePromise } from "./types.js";

export interface SessionStore {
  get<T = unknown>(key: string): MaybePromise<T | undefined>;
  set<T = unknown>(key: string, value: T): MaybePromise<void>;
  pull<T = unknown>(key: string): MaybePromise<T | undefined>;
  flash<T = unknown>(key: string, value: T): MaybePromise<void>;
  reflash(keys?: string[]): MaybePromise<void>;
}

export type ValidationErrorInput<TValue = string | string[]> = Record<
  string,
  TValue | TValue[]
>;

export interface ValidationErrorOptions {
  bag?: string;
}

export interface ValidationErrorPayload {
  errors: ValidationErrorInput;
  bag?: string;
}

export function validationError(
  errors: ValidationErrorInput,
  options: ValidationErrorOptions = {},
): ValidationErrorPayload {
  return {
    errors,
    bag: options.bag,
  };
}
