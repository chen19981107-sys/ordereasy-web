import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { trpc } from "@/lib/trpc";

interface MenuItemStat {
  name: string;
  totalQuantity: number;
}

export default function MenuOverviewScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const [activeTab, setActiveTab] = useState<"making" | "completed">("making");
  const { data: orders, isLoading } = trpc.orders.list.useQuery();

  // 計算待製作訂單中各品項的數量統計
  const makingStats: { [key: string]: MenuItemStat } = {};
  let totalMakingQuantity = 0;

  // 計算已完成訂單中各品項的數量統計
  const completedStats: { [key: string]: MenuItemStat } = {};
  let totalCompletedQuantity = 0;

  orders?.forEach((order) => {
    if (order.status === "making") {
      totalMakingQuantity += order.totalQuantity || 0;
      const items = order.mealContent.split(", ");
      items.forEach((item) => {
        const match = item.match(/(.+?)\s+x(\d+)/);
        if (match) {
          const name = match[1].trim();
          const qty = parseInt(match[2], 10);
          if (!makingStats[name]) {
            makingStats[name] = { name, totalQuantity: 0 };
          }
          makingStats[name].totalQuantity += qty;
        }
      });
    } else if (order.status === "picked_up") {
      totalCompletedQuantity += order.totalQuantity || 0;
      const items = order.mealContent.split(", ");
      items.forEach((item) => {
        const match = item.match(/(.+?)\s+x(\d+)/);
        if (match) {
          const name = match[1].trim();
          const qty = parseInt(match[2], 10);
          if (!completedStats[name]) {
            completedStats[name] = { name, totalQuantity: 0 };
          }
          completedStats[name].totalQuantity += qty;
        }
      });
    }
  });

  const sortedMakingStats = Object.values(makingStats).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  const sortedCompletedStats = Object.values(completedStats).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  const currentStats = activeTab === "making" ? sortedMakingStats : sortedCompletedStats;
  const totalQuantity = activeTab === "making" ? totalMakingQuantity : totalCompletedQuantity;

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 22 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground, flex: 1 },
    tabContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabButtonInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    tabButtonText: {
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
    },
    tabButtonTextActive: {
      color: colors.background,
    },
    tabButtonTextInactive: {
      color: colors.foreground,
    },
    statsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 8,
    },
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statLabel: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, fontWeight: "600" },
    statValue: { fontSize: 24 * fontSizeMultiplier, fontWeight: "800", color: colors.primary },
    menuList: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    menuItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    menuItemLeft: {
      flex: 1,
    },
    menuItemName: { fontSize: 16 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    menuItemQty: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, fontWeight: "600" },
    menuItemQtyValue: { fontSize: 20 * fontSizeMultiplier, fontWeight: "800", color: colors.primary },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyTitle: { fontSize: 18 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, textAlign: "center" },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>餐點總攬</Text>
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "making" ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setActiveTab("making")}
        >
          <Text style={[styles.tabButtonText, activeTab === "making" ? styles.tabButtonTextActive : styles.tabButtonTextInactive]}>
            待製作
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "completed" ? styles.tabButtonActive : styles.tabButtonInactive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text style={[styles.tabButtonText, activeTab === "completed" ? styles.tabButtonTextActive : styles.tabButtonTextInactive]}>
            已完成
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : currentStats.length > 0 ? (
        <FlatList
          data={currentStats}
          keyExtractor={(item) => item.name}
          ListHeaderComponent={
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{activeTab === "making" ? "待製作" : "已完成"}總份數</Text>
                <Text style={styles.statValue}>{totalQuantity}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemQty}>{activeTab === "making" ? "待製作" : "已完成"}數量</Text>
              </View>
              <Text style={styles.menuItemQtyValue}>{item.totalQuantity}</Text>
            </View>
          )}
          contentContainerStyle={styles.menuList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>沒有{activeTab === "making" ? "待製作" : "已完成"}訂單</Text>
          <Text style={styles.emptyText}>{activeTab === "making" ? "所有訂單已完成" : "還沒有完成的訂單"}</Text>
        </View>
      )}
    </ScreenContainer>
  );
}
