import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const MONTH_OPTIONS = [{ value: 7, label: '7天' }, { value: 1, label: '1個月' }, { value: 3, label: '3個月' }, { value: 6, label: '6個月' }, { value: 12, label: '12個月' }];

export default function AddStoreScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();

  const [storeName, setStoreName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subscriptionMonths, setSubscriptionMonths] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = trpc.admin.stores.create.useMutation({
    onSuccess: () => utils.admin.stores.list.invalidate(),
  });

  const handleSubmit = async () => {
    if (!storeName.trim()) { Alert.alert("提示", "請輸入店家名稱"); return; }
    if (!phoneNumber.trim() || !/^\d{10}$/.test(phoneNumber)) { Alert.alert("提示", "手機號碼必須為 10 碼數字"); return; }
    if (!password || password.length < 6) { Alert.alert("提示", "密碼至少需要 6 個字元"); return; }
    if (password !== confirmPassword) { Alert.alert("提示", "兩次密碼輸入不一致"); return; }

    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        storeName: storeName.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        subscriptionMonths,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const subscriptionLabel = subscriptionMonths === 7 ? '7天' : `${subscriptionMonths} 個月`;
      Alert.alert("成功", `店家「${storeName}」已建立，訂閱 ${subscriptionLabel}`, [
        { text: "確定", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "建立失敗，請稍後再試";
      Alert.alert("錯誤", message);
    } finally {
      setIsSubmitting(false);
    }
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
    section: { marginHorizontal: 16, marginTop: 24 },
    label: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthRow: { flexDirection: "row", gap: 10 },
    monthButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    monthText: { fontSize: 15, fontWeight: "700", color: colors.muted },
    monthTextActive: { color: "#fff" },
    submitButton: {
      margin: 24,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
    },
    submitText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新增店家帳號</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>店家名稱</Text>
            <TextInput
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="例：老王牛肉麵"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>手機號碼</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setPhoneNumber(cleaned);
              }}
              placeholder="10 碼手機號碼"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>登入密碼</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="至少 6 個字元"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>確認密碼</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="再次輸入密碼"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>訂閱月數</Text>
            <View style={styles.monthRow}>
              {MONTH_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.monthButton, subscriptionMonths === option.value && styles.monthButtonActive]}
                  onPress={() => setSubscriptionMonths(option.value)}
                >
                  <Text style={[styles.monthText, subscriptionMonths === option.value && styles.monthTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>建立店家帳號</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
