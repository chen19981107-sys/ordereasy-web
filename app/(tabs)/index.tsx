import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { useAppAuth } from "@/lib/auth-context";
import { useNotification } from "@/lib/notification-context";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { NotificationToast } from "@/components/notification-toast";
import { trpc } from "@/lib/trpc";

function formatPickupTime(time: Date | string): string {
  const d = new Date(time);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(time: Date | string): string {
  const d = new Date(time);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isToday(time: Date | string): boolean {
  const d = new Date(time);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function OrderListScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const { storeInfo } = useAppAuth();
  const { showNotification, notifications } = useNotification();
  const { playNotification } = useNotificationSound();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const { data: orders, isLoading, refetch, isRefetching } = trpc.orders.list.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const settingsQuery = trpc.settings.get.useQuery();

  // 監測新訂單並觸發提示（只計入未完成的訂單）
  useEffect(() => {
    if (orders && settingsQuery.data) {
      const currentOrders = orders.filter(order => order.status !== "picked_up");
      if (currentOrders.length > lastOrderCount) {
        const newOrderCount = currentOrders.length - lastOrderCount;
        const settings = settingsQuery.data;
        playNotification({
          soundEnabled: settings.notificationSoundEnabled ?? true,
          vibrationEnabled: settings.notificationVibrationEnabled ?? true,
        });
        showNotification({
          title: "新訂單提醒",
          message: `有 ${newOrderCount} 筆新訂單！`,
          type: "success",
          duration: 5000,
        });
      }
      setLastOrderCount(currentOrders.length);
    }
  }, [orders?.length, settingsQuery.data]);


  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      refetch();
      showNotification({
        title: "成功",
        message: "訂單已移除",
        type: "success",
        duration: 3000,
      });
    },
  });

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDelete = useCallback((id: number, mealContent: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "確認移除訂單",
      `確定要移除「${mealContent}」這筆訂單嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "確認移除",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteMutation.mutateAsync({ id });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("錯誤", "移除失敗，請稍後再試");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, [deleteMutation]);

  const handleStatusChange = useCallback((id: number, currentStatus: string) => {
    let newStatus: "making" | "ready" | "picked_up";
    if (currentStatus === "making") {
      newStatus = "ready";
    } else if (currentStatus === "ready") {
      newStatus = "picked_up";
    } else {
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newStatus === "picked_up") {
      Alert.alert(
        "確認取餐",
        "確定顧客已取餐？訂單將納入歷史。",
        [
          { text: "取消", style: "cancel" },
          {
            text: "確認取餐",
            onPress: async () => {
              setDeletingId(id);
              try {
                await updateStatusMutation.mutateAsync({ id, status: newStatus });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {
                Alert.alert("錯誤", "更新失敗，請稍後再試");
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    } else {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  }, [updateStatusMutation, deleteMutation]);

  // Check subscription warning
  const isExpiringSoon = storeInfo?.subscriptionExpiresAt
    ? (() => {
        const exp = new Date(storeInfo.subscriptionExpiresAt as string);
        const daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7 && daysLeft > 0;
      })()
    : false;

  // Filter orders by search text and status
  const filteredOrders = orders?.filter(order => {
    if (!searchText) return true;
    return order.phoneLastThree.includes(searchText);
  }) ?? [];
  
  // Separate current orders and picked up orders
  const currentOrders = filteredOrders.filter(order => order.status !== "picked_up");
  const pickedUpOrders = filteredOrders.filter(order => order.status === "picked_up");
  
  // Sort picked up orders from newest to oldest
  const sortedPickedUpOrders = [...pickedUpOrders].sort((a, b) => {
    const timeA = new Date(a.pickupTime).getTime();
    const timeB = new Date(b.pickupTime).getTime();
    return timeB - timeA; // Descending order (newest first)
  });
  
  // Display based on showHistory flag
  const displayOrders = showHistory ? sortedPickedUpOrders : currentOrders;

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
    headerTitle: { fontSize: 22 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground },
    headerSub: { fontSize: 13 * fontSizeMultiplier, color: colors.muted, marginTop: 2 },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    warningBanner: {
      backgroundColor: "#FFF3CD",
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    warningText: { fontSize: 13 * fontSizeMultiplier, color: "#856404", flex: 1 },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyIcon: { marginBottom: 16 },
    emptyTitle: { fontSize: 18 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, textAlign: "center" },
    card: {
      marginHorizontal: 16,
      marginVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    timeBox: {
      width: 56 * fontSizeMultiplier,
      height: 56 * fontSizeMultiplier,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    timeText: { fontSize: 18 * fontSizeMultiplier, fontWeight: "800", color: "#fff" },
    dateText: { fontSize: 10 * fontSizeMultiplier, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    statusText: { fontSize: 11 * fontSizeMultiplier, fontWeight: "600", color: "#fff" },
    cardContent: { flex: 1, marginLeft: 12 },
    mealText: { fontSize: 15 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    phoneText: { fontSize: 13 * fontSizeMultiplier, color: colors.muted, marginBottom: 2 },
    priceText: { fontSize: 13 * fontSizeMultiplier, fontWeight: "600", color: colors.primary, marginBottom: 2 },
    noteText: { fontSize: 12 * fontSizeMultiplier, color: colors.muted, marginTop: 2, fontStyle: "italic" },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    statusButton: {
      backgroundColor: colors.primary,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    actionButtonText: {
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "600",
      color: "#fff",
    },
    countText: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
      fontSize: 13 * fontSizeMultiplier,
      color: colors.muted,
      fontWeight: "600",
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>訂單管理</Text>
          <Text style={styles.headerSub}>{storeInfo?.storeName ?? "店家"}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/menu-overview" as never)}
          >
            <IconSymbol name="list.bullet" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/add-order" as never)}
          >
            <IconSymbol name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription Warning */}
      {isExpiringSoon && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ 訂閱即將到期，請聯繫管理員續訂
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜尋末三碼..."
          placeholderTextColor={colors.muted}
          value={searchText}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3);
            setSearchText(cleaned);
          }}
          keyboardType="numeric"
          maxLength={3}
        />
      </View>

      {/* History Toggle */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        <TouchableOpacity
          style={[
            { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center", borderWidth: 1 },
            !showHistory
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowHistory(false)}
        >
          <Text
            style={{
              fontWeight: "600",
              fontSize: 14,
              color: !showHistory ? "#fff" : colors.foreground,
            }}
          >
            當日訂單
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center", borderWidth: 1 },
            showHistory
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowHistory(true)}
        >
          <Text
            style={{
              fontWeight: "600",
              fontSize: 14,
              color: showHistory ? "#fff" : colors.foreground,
            }}
          >
            歷史訂單
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {searchText ? "找不到訂單" : "目前沒有訂單"}
          </Text>
          <Text style={styles.emptyText}>
            {searchText ? "試試其他末三碼" : "點擊 + 新增訂單"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, item.status === "picked_up" && { opacity: 0.6, backgroundColor: colors.muted }]}>
              <View style={styles.cardHeader}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{formatPickupTime(item.pickupTime)}</Text>
                  <Text style={styles.dateText}>{formatDate(item.pickupTime)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === "picked_up" ? colors.success : colors.warning }
                ]}>
                  <Text style={styles.statusText}>
                    {item.status === "making" ? "待製作" : item.status === "ready" ? "待取餐" : "已取餐"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.mealText}>{item.mealContent}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                    <Text style={{ fontSize: 14 * fontSizeMultiplier, fontWeight: '700', color: '#fff' }}>{item.phoneLastThree}</Text>
                  </View>
                </View>
                {item.totalPrice > 0 && (
                  <Text style={styles.priceText}>金額: ${(item.totalPrice / 100).toFixed(2)}</Text>
                )}
                {item.note && <Text style={styles.noteText}>備註: {item.note}</Text>}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.statusButton, item.status === "picked_up" && { opacity: 0.5 }]}
                  onPress={() => handleStatusChange(item.id, item.status)}
                  disabled={deletingId === item.id || item.status === "picked_up"}
                >
                  <Text style={styles.actionButtonText}>
                    {item.status === "making" ? "已完成" : item.status === "ready" ? "已取餐" : "已取餐"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item.id, item.mealContent)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>刪除</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      )}
      {notifications.map((notif) => (
        <NotificationToast
          key={notif.id}
          visible={true}
          title={notif.title}
          message={notif.message}
          type={notif.type}
          duration={notif.duration}
          onDismiss={() => {}}
        />
      ))}
    </ScreenContainer>
  );
}
