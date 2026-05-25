import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/**
 * App 入口畫面
 * 負責：
 * 1. 等待 Auth 狀態載入
 * 2. 檢查是否需要初始設定（無管理員帳號）
 * 3. 依登入狀態導向對應畫面
 */
export default function IndexScreen() {
  const colors = useColors();
  const { role, isLoading } = useAppAuth();

  const { data: setupData, isLoading: isCheckingSetup } = trpc.admin.checkSetup.useQuery(
    undefined,
    {
      // 只在 auth 載入完成且未登入時才查詢
      enabled: !isLoading && role === null,
      retry: 2,
    }
  );

  useEffect(() => {
    if (isLoading) return;
    if (isCheckingSetup && role === null) return;

    if (role === "admin") {
      router.replace("/(admin)" as never);
      return;
    }

    if (role === "store") {
      router.replace("/(tabs)");
      return;
    }

    // 未登入：檢查是否需要初始設定
    if (setupData?.needsSetup) {
      router.replace("/setup" as never);
    } else {
      router.replace("/login" as never);
    }
  }, [isLoading, isCheckingSetup, role, setupData]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      gap: 16,
    },
    appName: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.5,
    },
    tagline: {
      fontSize: 14,
      color: colors.muted,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>輕鬆點餐</Text>
      <Text style={styles.tagline}>餐飲訂單管理系統</Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 8 }} />
    </View>
  );
}
