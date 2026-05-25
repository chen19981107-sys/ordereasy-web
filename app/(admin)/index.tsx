import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "未設定";
  const date = new Date(d);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
}

function getSubStatus(expiresAt: Date | string | null | undefined, isActive: boolean): { label: string; color: string } {
  if (!isActive) return { label: "已停用", color: "#9BA1A6" };
  if (!expiresAt) return { label: "未設定", color: "#9BA1A6" };
  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "已到期", color: "#EF4444" };
  if (daysLeft <= 7) return { label: `剩 ${daysLeft} 天`, color: "#F59E0B" };
  return { label: `有效中`, color: "#22C55E" };
}

export default function AdminDashboardScreen() {
  const colors = useColors();
  const { adminInfo, logout } = useAppAuth();

  const { data: stores, isLoading, refetch, isRefetching } = trpc.admin.stores.list.useQuery();

  const handleLogout = () => {
    Alert.alert("確認登出", "確定要登出管理員帳號嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    headerActions: { flexDirection: "row", gap: 10 },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    countText: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
      fontSize: 13,
      color: colors.muted,
      fontWeight: "600",
    },
    card: {
      marginHorizontal: 16,
      marginVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    cardLeft: { flex: 1 },
    storeName: { fontSize: 17, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    storeUsername: { fontSize: 13, color: colors.muted, marginBottom: 4 },
    expireText: { fontSize: 12, color: colors.muted },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      marginLeft: 12,
    },
    statusText: { fontSize: 13, fontWeight: "700" },
    chevron: { marginLeft: 8 },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 8, marginTop: 16 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>管理後台</Text>
          <Text style={styles.headerSub}>管理員：{adminInfo?.username ?? "-"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/(admin)/add-store" as never)}
          >
            <IconSymbol name="plus" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => router.push("/(admin)/admins" as never)}
          >
            <IconSymbol name="shield.fill" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {stores && stores.length > 0 && (
            <Text style={styles.countText}>共 {stores.length} 間店家</Text>
          )}
          <FlatList
            data={stores ?? []}
            keyExtractor={(item) => item.id.toString()}
            refreshing={isRefetching}
            onRefresh={refetch}
            contentContainerStyle={stores?.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol name="storefront.fill" size={64} color={colors.muted} />
                <Text style={styles.emptyTitle}>尚未有店家帳號</Text>
                <Text style={styles.emptyText}>點擊右上角「+」新增第一間店家</Text>
              </View>
            }
            renderItem={({ item }) => {
              const status = getSubStatus(item.subscriptionExpiresAt, item.isActive);
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/(admin)/store/${item.id}` as never)}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.storeName}>{item.storeName}</Text>
                    <Text style={styles.storeUsername}>手機：{item.phoneNumber}</Text>
                    <Text style={styles.expireText}>
                      到期日：{formatDate(item.subscriptionExpiresAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + "22" }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} style={styles.chevron} />
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </ScreenContainer>
  );
}
