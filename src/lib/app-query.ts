import type { QueryClient } from "@tanstack/react-query";

let appQueryClient: QueryClient | null = null;

export function setAppQueryClient(client: QueryClient): void {
  appQueryClient = client;
}

export function getAppQueryClient(): QueryClient {
  if (!appQueryClient) {
    throw new Error("App QueryClient is not initialized.");
  }
  return appQueryClient;
}

export function tryGetAppQueryClient(): QueryClient | null {
  return appQueryClient;
}
