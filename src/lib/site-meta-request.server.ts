import { AsyncLocalStorage } from "node:async_hooks";

import { registerSsrOriginResolver } from "./site-meta";

const requestOriginStorage = new AsyncLocalStorage<string>();

registerSsrOriginResolver(() => requestOriginStorage.getStore());

export function runWithRequestSiteOrigin<T>(origin: string, fn: () => T | Promise<T>): T | Promise<T> {
  return requestOriginStorage.run(origin, fn);
}
