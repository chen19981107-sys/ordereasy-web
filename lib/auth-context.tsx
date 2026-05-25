import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { trpc } from "./trpc";

export type AuthRole = "store" | "admin" | null;

interface StoreInfo {
  storeId: number;
  storeName: string;
  phoneNumber: string;
  subscriptionExpiresAt?: string | null;
  token: string;
}

interface AdminInfo {
  adminId: number;
  username: string;
  token: string;
}

interface AuthContextValue {
  role: AuthRole;
  storeInfo: StoreInfo | null;
  adminInfo: AdminInfo | null;
  isLoading: boolean;
  loginAsStore: (phoneNumber: string, password: string) => Promise<void>;
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORE_KEY = "store_session";
const ADMIN_KEY = "admin_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AuthRole>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeMutation = trpc.store.login.useMutation();
  const adminMutation = trpc.admin.login.useMutation();

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [storeRaw, adminRaw] = await Promise.all([
          AsyncStorage.getItem(STORE_KEY),
          AsyncStorage.getItem(ADMIN_KEY),
        ]);
        if (adminRaw) {
          const info: AdminInfo = JSON.parse(adminRaw);
          setAdminInfo(info);
          setRole("admin");
        } else if (storeRaw) {
          const info: StoreInfo = JSON.parse(storeRaw);
          // Check subscription
          if (info.subscriptionExpiresAt && new Date(info.subscriptionExpiresAt) < new Date()) {
            await AsyncStorage.removeItem(STORE_KEY);
          } else {
            setStoreInfo(info);
            setRole("store");
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginAsStore = useCallback(async (phoneNumber: string, password: string) => {
    const result = await storeMutation.mutateAsync({ phoneNumber, password });
    const info: StoreInfo = {
      storeId: result.storeId,
      storeName: result.storeName,
      phoneNumber: result.phoneNumber,
      subscriptionExpiresAt: result.subscriptionExpiresAt
        ? new Date(result.subscriptionExpiresAt as unknown as string).toISOString()
        : null,
      token: result.token,
    };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(info));
    setStoreInfo(info);
    setRole("store");
  }, [storeMutation]);

  const loginAsAdmin = useCallback(async (username: string, password: string) => {
    const result = await adminMutation.mutateAsync({ username, password });
    const info: AdminInfo = {
      adminId: result.adminId,
      username: result.username,
      token: result.token,
    };
    await AsyncStorage.setItem(ADMIN_KEY, JSON.stringify(info));
    setAdminInfo(info);
    setRole("admin");
  }, [adminMutation]);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORE_KEY),
      AsyncStorage.removeItem(ADMIN_KEY),
    ]);
    setStoreInfo(null);
    setAdminInfo(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ role, storeInfo, adminInfo, isLoading, loginAsStore, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAppAuth must be used within AuthProvider");
  return ctx;
}
