import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const EXTEND_OPTIONS = [1, 3, 6, 12];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "未設定";
  const date = new Date(d);
  return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, "0")}月${date.getDate().toString().padStart(2, "0")}日`;
}

export default function StoreDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = parseInt(id ?? "0", 10);
  const utils = trpc.useUtils();

  const { data: store, isLoading } = trpc.admin.stores.get.useQuery({ id: storeId });

  const updateMutation = trpc.admin.stores.update.useMutation({
    onSuccess: () => utils.admin.stores.list.invalidate(),
  });
  const extendMutation = trpc.admin.stores.extendSubscription.useMutation({
    onSuccess: () => {
      utils.admin.stores.list.invalidate();
      utils.admin.stores.get.invalidate({ id: storeId });
    },
  });
  const deleteMutation = trpc.admin.stores.delete.useMutation({
    onSuccess: () => {
      utils.admin.stores.list.invalidate();
      router.back();
    },
  });
  const trialMutation = trpc.admin.stores.setTrial.useMutation({
    onSuccess: () => {
      utils.admin.stores.get.invalidate({ id: storeId });
      Alert.alert("成功", "7天試用已開放");
    },
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleActive = async (value: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: storeId, isActive: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("錯誤", "更新失敗");
    }
  };

  const handleSetExpiry = async (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (!date) return;
    try {
      await updateMutation.mutateAsync({
        id: storeId,
        subscriptionExpiresAt: date.toISOString(),
      });
    } catch {
      Alert.alert("錯誤", "更新失敗");
    }
  };

  const handleExtend = async (months: number) => {
    try {
      const result = await extendMutation.mutateAsync({ id: storeId, months });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("成功", `訂閱已延長 ${months} 個月\n新到期日：${formatDate(result.subscriptionExpiresAt)}`);
    } catch {
      Alert.alert("錯誤", "延長失敗");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { Alert.alert("提示", "新密碼至少需要 6 個字元"); return; }
    if (newPassword !== confirmPassword) { Alert.alert("提示", "兩次密碼不一致"); return; }
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({ id: storeId, newPassword });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("成功", "密碼已重設");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      Alert.alert("錯誤", "重設失敗");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "刪除店家",
      `確定要刪除「${store?.storeName}」嗎？此操作無法復原。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "確認刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({ id: storeId });
            } catch {
              Alert.alert("錯誤", "刪除失敗");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground, flex: 1 },
    section: {
      marginHorizontal: 16,
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    sectionTitle: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
    },
    rowFirst: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" },
    rowValue: { fontSize: 15, color: colors.muted },
    input: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
    monthButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthText: { fontSize: 13, fontWeight: "700", color: colors.muted },
    actionButton: {
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    actionText: { fontSize: 16, fontWeight: "700" },
    deleteButton: {
      margin: 16,
      marginTop: 24,
      backgroundColor: "#FEE2E2",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    deleteText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
  });

  if (isLoading || !store) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{store.storeName}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本資訊</Text>
            <View style={styles.rowFirst}>
              <Text style={styles.rowLabel}>店家名稱</Text>
              <Text style={styles.rowValue}>{store.storeName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>手機號碼</Text>
              <Text style={styles.rowValue}>{store.phoneNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>建立日期</Text>
              <Text style={styles.rowValue}>{formatDate(store.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>帳號狀態</Text>
              <Switch
                value={store.isActive}
                onValueChange={handleToggleActive}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Subscription */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>訂閱管理</Text>
            <View style={styles.rowFirst}>
              <Text style={styles.rowLabel}>到期日</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.rowValue, { color: colors.primary, fontWeight: "700" }]}>
                  {formatDate(store.subscriptionExpiresAt)} ✏️
                </Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleSetExpiry}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginRight: 16, marginBottom: 8, padding: 8 }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>確定</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionTitle, { paddingTop: 8 }]}>快速延長訂閱</Text>
            <View style={styles.monthRow}>
              {EXTEND_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.monthButton}
                  onPress={() => handleExtend(m)}
                >
                  <Text style={styles.monthText}>+{m}月</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + "22", marginBottom: 16 }]}
              onPress={() => {
                Alert.alert("確認", "開放 7 天試用？", [
                  { text: "取消", style: "cancel" },
                  {
                    text: "確認",
                    onPress: async () => {
                      try {
                        await trialMutation.mutateAsync({ id: storeId });
                      } catch {
                        Alert.alert("錯誤", "開放失敗");
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={[styles.actionText, { color: colors.success }]}>開放 7 天試用</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>重設密碼</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="新密碼（至少 6 個字元）"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="確認新密碼"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + "22", marginBottom: 16 }]}
              onPress={handleResetPassword}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.actionText, { color: colors.primary }]}>確認重設密碼</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>刪除此店家帳號</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
