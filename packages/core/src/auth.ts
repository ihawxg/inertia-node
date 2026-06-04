import type { MaybePromise } from "./types.js";

export interface AuthConfig<TRequest, TUser, TSerialized = TUser> {
  getUser(request: TRequest): MaybePromise<TUser | null>;
  login(request: TRequest, user: TUser): MaybePromise<void>;
  logout(request: TRequest): MaybePromise<void>;
  serializeUser?(user: TUser): MaybePromise<TSerialized>;
  redirectTo?: string;
  home?: string;
}

export interface AuthRuntime<TUser, TSerialized = TUser> {
  user(): Promise<TUser | null>;
  check(): Promise<boolean>;
  login(user: TUser): Promise<void>;
  logout(): Promise<void>;
  serializedUser(): Promise<TSerialized | null>;
}

export function inertiaAuth<TRequest, TUser, TSerialized = TUser>(
  config: AuthConfig<TRequest, TUser, TSerialized>,
): AuthConfig<TRequest, TUser, TSerialized> {
  return config;
}
