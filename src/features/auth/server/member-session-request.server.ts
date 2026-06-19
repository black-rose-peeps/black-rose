import { AsyncLocalStorage } from "node:async_hooks";

const requestMemberIdStorage = new AsyncLocalStorage<string | null>();

export function runWithRequestMemberId<T>(
  memberId: string | null,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestMemberIdStorage.run(memberId, fn);
}

export function getRequestMemberId(): string | null {
  return requestMemberIdStorage.getStore() ?? null;
}

/** Ensure the caller's session matches the requested member id (server-side only). */
export function assertRequestMemberId(memberId: string): void {
  const sessionMemberId = getRequestMemberId();
  if (!sessionMemberId) {
    throw new Error("Please sign in again.");
  }
  if (sessionMemberId !== memberId) {
    throw new Error("Unauthorized.");
  }
}
