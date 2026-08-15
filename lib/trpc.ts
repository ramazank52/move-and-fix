import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";

let csrfTokenPromise: Promise<string | null> | null = null;

async function getWebCsrfToken(): Promise<string | null> {
  if (Platform.OS !== "web") return null;
  csrfTokenPromise ??= fetch(`${getApiBaseUrl()}/api/csrf-token`, {
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json() as { token?: unknown };
      return typeof body.token === "string" ? body.token : null;
    })
    .catch(() => null);
  return csrfTokenPromise;
}

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          if (token) return { Authorization: `Bearer ${token}` };
          const csrfToken = await getWebCsrfToken();
          return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
