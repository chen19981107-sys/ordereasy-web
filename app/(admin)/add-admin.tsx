import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function AddAdminScreen() {
  const colors = useColors();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const createMutation = trpc.admin.admins.create.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("成功", "管理員帳號已建立", [
        {
          text: "確認",
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("錯誤", error.message || "建立失敗，請稍後再試");
    },
  });

  const handleCreate = useCallback(async () => {
    if (!username.trim()) {
      Alert.alert("錯誤", "請輸入帳號");
      return;
    }
    if (!password.trim()) {
      Alert.alert("錯誤", "請輸入密碼");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("錯誤", "密碼不相符");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await createMutation.mutateAsync({
        username: username.trim(),
        password,
      });
    } catch (error) {
      // Error is handled by onError callback
    }
  }, [username, password, confirmPassword, createMutation]);

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      paddingTop: 2,
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff",
    },
    note: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 8,
      fontStyle: "italic",
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>新增管理員</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "300", color: colors.foreground }}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.section}>
          <Text style={styles.label}>帳號</Text>
          <TextInput
            style={styles.input}
            placeholder="請輸入帳號"
            placeholderTextColor={colors.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Text style={styles.note}>帳號可以是任何字符，不受限制</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            placeholder="請輸入密碼"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Text style={styles.note}>密碼可以是任何字符，不受限制</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>確認密碼</Text>
          <TextInput
            style={styles.input}
            placeholder="請再次輸入密碼"
            placeholderTextColor={colors.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>建立管理員</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
