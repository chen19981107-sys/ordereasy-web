import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * tRPC React client for type-safe API calls.
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Automatically injects store/admin session tokens from AsyncStorage.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const headers: Record<string, string> = {};
          try {
            const storeRaw = await AsyncStorage.getItem("store_session");
            if (storeRaw) {
              const info = JSON.parse(storeRaw);
              if (info.token) headers["x-store-token"] = info.token;
            }
            const adminRaw = await AsyncStorage.getItem("admin_session");
            if (adminRaw) {
              const info = JSON.parse(adminRaw);
              if (info.token) headers["x-admin-token"] = info.token;
            }
          } catch {
            // ignore storage errors
          }
          return headers;
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
