import { Alert, Clipboard, Linking, StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView, ActivityIndicator, Modal } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

const LIFF_ID = "2010099034-bRRDAVqf";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "未設定";
  const date = new Date(d);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
}

function getSubscriptionStatus(expiresAt: Date | string | null | undefined): { label: string; color: string } {
  if (!expiresAt) return { label: "未設定", color: "#9BA1A6" };
  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "已到期", color: "#EF4444" };
  if (daysLeft <= 7) return { label: `剩 ${daysLeft} 天`, color: "#F59E0B" };
  return { label: `剩 ${daysLeft} 天`, color: "#22C55E" };
}

export default function ProfileScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const { storeInfo, logout } = useAppAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [lineUserId, setLineUserId] = useState("");
  const [isSavingLine, setIsSavingLine] = useState(false);

  const updatePasswordMutation = trpc.store.updatePassword.useMutation();
  const setLineRecipientMutation = trpc.store.setLineOrderRecipient.useMutation();
  const lineRecipientQuery = trpc.store.getLineOrderRecipient.useQuery();

  const subStatus = getSubscriptionStatus(storeInfo?.subscriptionExpiresAt);

  // LIFF 訂單連結
  const liffOrderUrl = storeInfo?.storeId
    ? `https://liff.line.me/${LIFF_ID}?storeId=${storeInfo.storeId}`
    : null;

  const handleLogout = () => {
    Alert.alert("確認登出", "確定要登出嗎？", [
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

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim()) { Alert.alert("提示", "請輸入目前密碼"); return; }
    if (!newPassword.trim() || newPassword.length < 6) { Alert.alert("提示", "新密碼至少需要 6 個字元"); return; }
    if (newPassword !== confirmPassword) { Alert.alert("提示", "新密碼與確認密碼不一致"); return; }
    if (currentPassword === newPassword) { Alert.alert("提示", "新密碼不能與目前密碼相同"); return; }

    setIsUpdatingPassword(true);
    try {
      await updatePasswordMutation.mutateAsync({ currentPassword, newPassword });
      Alert.alert("成功", "密碼已更新", [{
        text: "確定", onPress: () => {
          setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
          setShowPasswordModal(false);
        },
      }]);
    } catch (err: unknown) {
      Alert.alert("錯誤", err instanceof Error ? err.message : "更新失敗，請稍後再試");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveLineRecipient = async () => {
    if (!lineUserId.trim()) { Alert.alert("提示", "請輸入 LINE User ID"); return; }
    if (!lineUserId.startsWith("U")) { Alert.alert("提示", "LINE User ID 格式錯誤，應以 U 開頭"); return; }
    setIsSavingLine(true);
    try {
      await setLineRecipientMutation.mutateAsync({ lineOrderRecipientUserId: lineUserId.trim() });
      await lineRecipientQuery.refetch();
      Alert.alert("成功", "LINE 通知接收人已設定", [{ text: "確定", onPress: () => setShowLineModal(false) }]);
    } catch (err: unknown) {
      Alert.alert("錯誤", err instanceof Error ? err.message : "設定失敗");
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleCopyUrl = () => {
    if (liffOrderUrl) {
      Clipboard.setString(liffOrderUrl);
      Alert.alert("已複製", "LIFF 訂單連結已複製到剪貼簿");
    }
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    storeName: { fontSize: 26 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground },
    username: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, marginTop: 4 },
    sectionLabel: {
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.muted,
      marginHorizontal: 20,
      marginTop: 24,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    section: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    rowLast: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    rowLabel: { flex: 1, fontSize: 15 * fontSizeMultiplier, color: colors.foreground, fontWeight: "500" },
    rowValue: { fontSize: 14 * fontSizeMultiplier, color: colors.muted },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 13 * fontSizeMultiplier, fontWeight: "700" },
    liffUrlBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    liffUrlText: {
      fontSize: 12 * fontSizeMultiplier,
      color: colors.muted,
      fontFamily: "monospace",
    },
    copyBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
    },
    copyBtnText: { color: "#fff", fontSize: 14 * fontSizeMultiplier, fontWeight: "700" },
    logoutButton: {
      margin: 24,
      backgroundColor: colors.error,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    logoutText: { color: "#fff", fontSize: 17 * fontSizeMultiplier, fontWeight: "700" },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 30,
    },
    modalTitle: { fontSize: 18 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground, marginBottom: 8 },
    modalSubtitle: { fontSize: 13 * fontSizeMultiplier, color: colors.muted, marginBottom: 20, lineHeight: 20 },
    modalInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    modalButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    modalButtonText: { color: "#fff", fontSize: 16 * fontSizeMultiplier, fontWeight: "700" },
    cancelButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  });

  const currentRecipient = lineRecipientQuery.data?.lineOrderRecipientUserId;

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.storeName}>{storeInfo?.storeName ?? "店家"}</Text>
          <Text style={styles.username}>手機：{storeInfo?.phoneNumber ?? "-"}</Text>
        </View>

        {/* Subscription Info */}
        <Text style={styles.sectionLabel}>訂閱資訊</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>訂閱到期日</Text>
            <Text style={styles.rowValue}>{formatDate(storeInfo?.subscriptionExpiresAt)}</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={styles.rowLabel}>訂閱狀態</Text>
            <View style={[styles.statusBadge, { backgroundColor: subStatus.color + "22" }]}>
              <Text style={[styles.statusText, { color: subStatus.color }]}>{subStatus.label}</Text>
            </View>
          </View>
        </View>

        {/* LIFF Order Link */}
        <Text style={styles.sectionLabel}>LINE 線上訂餐連結</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => setShowLineModal(true)}>
            <Text style={styles.rowLabel}>LINE 通知接收人</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {currentRecipient ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              ) : (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }} />
              )}
              <Text style={styles.rowValue}>{currentRecipient ? "已設定" : "未設定"}</Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
          {liffOrderUrl && (
            <View style={styles.rowLast}>
              <Text style={[styles.rowLabel, { fontSize: 14 * fontSizeMultiplier }]}>訂單表單連結</Text>
              <TouchableOpacity onPress={handleCopyUrl} style={{ backgroundColor: colors.primary + "22", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 13 * fontSizeMultiplier, fontWeight: "700" }}>複製連結</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {liffOrderUrl && (
          <View style={styles.liffUrlBox}>
            <Text style={styles.liffUrlText} numberOfLines={2}>{liffOrderUrl}</Text>
          </View>
        )}

        {/* Account Security */}
        <Text style={styles.sectionLabel}>帳號安全</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.rowLabel}>修改密碼</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.rowLast}>
            <Text style={styles.rowLabel}>帳號狀態</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              <Text style={styles.rowValue}>正常</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="arrow.left" size={20} color="#fff" />
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide"
        onRequestClose={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改密碼</Text>
            <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword}
              placeholder="目前密碼" placeholderTextColor={colors.muted} secureTextEntry returnKeyType="next" />
            <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword}
              placeholder="新密碼（至少 6 個字元）" placeholderTextColor={colors.muted} secureTextEntry returnKeyType="next" />
            <TextInput style={styles.modalInput} value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder="確認新密碼" placeholderTextColor={colors.muted} secureTextEntry returnKeyType="done" />
            <TouchableOpacity style={styles.modalButton} onPress={handleUpdatePassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>確認修改</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(false); }}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LINE Recipient Modal */}
      <Modal visible={showLineModal} transparent animationType="slide"
        onRequestClose={() => setShowLineModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>設定 LINE 通知接收人</Text>
            <Text style={styles.modalSubtitle}>
              輸入要接收新訂單通知的 LINE User ID。{"\n"}
              取得方式：至 LINE Developers Console → 選擇 Channel → Basic settings → Your user ID（格式：Uxxxxxxxxxx）
            </Text>
            {currentRecipient && (
              <View style={{ backgroundColor: colors.success + "22", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 12 * fontSizeMultiplier, color: colors.success, fontWeight: "600" }}>
                  目前設定：{currentRecipient}
                </Text>
              </View>
            )}
            <TextInput
              style={styles.modalInput}
              value={lineUserId}
              onChangeText={setLineUserId}
              placeholder={currentRecipient || "U748923442f29b67ceefc88f4f1d86657"}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveLineRecipient} disabled={isSavingLine}>
              {isSavingLine ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>儲存設定</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLineModal(false)}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
