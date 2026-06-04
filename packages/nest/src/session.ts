import type { SessionStore } from "@inertia-node/core";
import type { Request } from "express";

export function nestExpressSessionAdapter(): (
  request: Request,
) => SessionStore | undefined {
  return (request: Request) => {
    const session = (request as Request & { session?: Record<string, any> })
      .session;

    if (!session) {
      return undefined;
    }

    return {
      get: <T = unknown>(key: string) => session[key] as T | undefined,
      set: <T = unknown>(key: string, value: T) => {
        session[key] = value;
      },
      pull: <T = unknown>(key: string) => {
        const value = session[key] as T | undefined;
        delete session[key];
        return value;
      },
      flash: <T = unknown>(key: string, value: T) => {
        session[key] = value;
      },
      reflash: () => {
        // express-session keeps values until explicitly pulled.
      },
    };
  };
}
