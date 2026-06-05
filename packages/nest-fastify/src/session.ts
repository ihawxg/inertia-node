import type { SessionStore } from "@inertia-node/core";
import type { FastifyRequest } from "fastify";

interface FastifySessionLike {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  delete?(key: string): void;
  save?(callback?: (error?: unknown) => void): Promise<void> | void;
}

export function fastifySessionAdapter(): (
  request: FastifyRequest,
) => SessionStore | undefined {
  return (request: FastifyRequest) => {
    const session = (
      request as FastifyRequest & { session?: FastifySessionLike }
    ).session;

    if (!session) {
      return undefined;
    }

    return {
      get: <T = unknown>(key: string) => session.get<T>(key),
      set: <T = unknown>(key: string, value: T) => {
        session.set(key, value);
      },
      pull: <T = unknown>(key: string) => {
        const value = session.get<T>(key);

        if (session.delete) {
          session.delete(key);
        } else {
          session.set(key, undefined);
        }

        return value;
      },
      flash: <T = unknown>(key: string, value: T) => {
        session.set(key, value);
      },
      reflash: () => {
        // @fastify/session keeps values until explicitly pulled.
      },
    };
  };
}
