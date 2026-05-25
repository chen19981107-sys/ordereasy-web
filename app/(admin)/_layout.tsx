import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { useAppAuth } from "@/lib/auth-context";

export default function AdminLayout() {
  const { role, isLoading } = useAppAuth();

  useEffect(() => {
    if (!isLoading && role !== "admin") {
      router.replace("/login");
    }
  }, [role, isLoading]);

  if (isLoading || role !== "admin") return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-store" />
      <Stack.Screen name="store/[id]" />
      <Stack.Screen name="admins" />
      <Stack.Screen name="add-admin" />
    </Stack>
  );
}
