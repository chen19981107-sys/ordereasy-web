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
import { useColors } from "@/hooks/use-colors";
import { useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function SetupScreen() {
  const colors = useColors();
  const { loginAsAdmin } = useAppAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setupMutation = trpc.admin.setup.useMutation();

  const handleSetup = async () => {
    if (!username.trim() || username.trim().length < 3) {
      Alert.alert("提示", "管理員帳號至少需要 3 個字元");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("提示", "密碼至少需要 6 個字元");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("提示", "兩次密碼輸入不一致");
      return;
    }

    setIsSubmitting(true);
    try {
      // 建立管理員帳號
      await setupMutation.mutateAsync({
        username: username.trim(),
        password,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 建立成功後自動登入
      await loginAsAdmin(username.trim(), password);
      router.replace("/(admin)" as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "設定失敗，請稍後再試";
      Alert.alert("錯誤", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flexGrow: 1, padding: 28, justifyContent: "center" },
    badge: {
      alignSelf: "center",
      backgroundColor: colors.primary + "18",
      borderRadius: 50,
      width: 80,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    badgeText: { fontSize: 40 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 36,
    },
    infoCard: {
      backgroundColor: colors.primary + "12",
      borderRadius: 14,
      padding: 16,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    infoText: {
      fontSize: 13,
      color: colors.primary,
      lineHeight: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
      marginBottom: 8,
      marginTop: 16,
    },
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
    submitButton: {
      marginTop: 32,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
    },
    submitText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    hint: {
      marginTop: 16,
      textAlign: "center",
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔐</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>初始設定</Text>
          <Text style={styles.subtitle}>
            歡迎使用 OrderEasy！{"\n"}請設定第一組管理員帳號
          </Text>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              此帳號將用於管理所有店家的訂閱與使用權限，請妥善保管帳號密碼。設定完成後，此畫面將不再出現。
            </Text>
          </View>

          {/* Form */}
          <Text style={styles.label}>管理員帳號</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="至少 3 個字元"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="至少 6 個字元"
            placeholderTextColor={colors.muted}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.label}>確認密碼</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="再次輸入密碼"
            placeholderTextColor={colors.muted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSetup}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSetup}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>完成設定並登入</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            設定完成後將自動登入管理員後台
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
