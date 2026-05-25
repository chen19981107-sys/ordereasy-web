import { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAppAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { useThemeContext } from "@/lib/theme-provider";
import { IconSymbol } from "@/components/ui/icon-symbol";

const STORE_CREDENTIALS_KEY = "ordereasy_store_credentials";
const ADMIN_CREDENTIALS_KEY = "ordereasy_admin_credentials";

export default function LoginScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const { loginAsStore, loginAsAdmin } = useAppAuth();
  const { colorScheme, setColorScheme } = useThemeContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"store" | "admin">("store");
  const [rememberMe, setRememberMe] = useState(true);

  // 初始化時載入保存的帳號密碼
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // 優先加載店家登入的保存信息
        const storeCredentials = await AsyncStorage.getItem(STORE_CREDENTIALS_KEY);
        if (storeCredentials) {
          const { username: savedUsername, password: savedPassword } = JSON.parse(storeCredentials);
          setUsername(savedUsername || "");
          setPassword(savedPassword || "");
          setLoginMode("store");
          setRememberMe(true);
          return;
        }
        
        // 如果沒有店家信息，嘗試加載管理員登入的保存信息
        const adminCredentials = await AsyncStorage.getItem(ADMIN_CREDENTIALS_KEY);
        if (adminCredentials) {
          const { username: savedUsername, password: savedPassword } = JSON.parse(adminCredentials);
          setUsername(savedUsername || "");
          setPassword(savedPassword || "");
          setLoginMode("admin");
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Failed to load saved credentials", err);
      }
    }
    loadSavedCredentials();
  }, []);

  // 當登入模式改變時，加載對應的保存帳號密碼
  useEffect(() => {
    const loadCredentialsForMode = async () => {
      try {
        const key = loginMode === "admin" ? ADMIN_CREDENTIALS_KEY : STORE_CREDENTIALS_KEY;
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const { username: savedUsername, password: savedPassword } = JSON.parse(saved);
          setUsername(savedUsername || "");
          setPassword(savedPassword || "");
          setRememberMe(true);
        } else {
          // 如果沒有保存的信息，清空輸入框
          setUsername("");
          setPassword("");
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Failed to load credentials for mode", err);
      }
    }
    loadCredentialsForMode();
  }, [loginMode]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("提示", "請輸入帳號與密碼");
      return;
    }
    setIsLoading(true);
    try {
      if (loginMode === "admin") {
        await loginAsAdmin(username.trim(), password);
      } else {
        // 店家登入需要驗證手機號碼格式
        if (!/^\d{10}$/.test(username.trim())) {
          Alert.alert("提示", "手機號碼必須為 10 碼數字");
          setIsLoading(false);
          return;
        }
        await loginAsStore(username.trim(), password);
      }

      // 保存或清除帳號密碼（根據登入模式分開存儲）
      const credentialsKey = loginMode === "admin" ? ADMIN_CREDENTIALS_KEY : STORE_CREDENTIALS_KEY;
      if (rememberMe) {
        await AsyncStorage.setItem(
          credentialsKey,
          JSON.stringify({ username: username.trim(), password })
        );
      } else {
        await AsyncStorage.removeItem(credentialsKey);
      }

      router.replace(loginMode === "admin" ? ("/(admin)" as never) : "/(tabs)");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "登入失敗，請稍後再試";
      Alert.alert("登入失敗", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = () => {
    setColorScheme(colorScheme === "light" ? "dark" : "light");
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    inner: { flex: 1, justifyContent: "center", padding: 28 },
    logoArea: { alignItems: "center", marginBottom: 40 },
    appName: { fontSize: 32 * fontSizeMultiplier, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
    tagline: { fontSize: 14 * fontSizeMultiplier, color: colors.muted, marginTop: 6 },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 28,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 10,
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 14 * fontSizeMultiplier, fontWeight: "600", color: colors.muted },
    tabTextActive: { color: "#fff" },
    label: { fontSize: 13 * fontSizeMultiplier, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      gap: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    rememberText: { fontSize: 14 * fontSizeMultiplier, color: colors.foreground, flex: 1 },
    button: {
      marginTop: 28,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    buttonText: { color: "#fff", fontSize: 17 * fontSizeMultiplier, fontWeight: "700" },
    hint: { marginTop: 16, textAlign: "center", fontSize: 12 * fontSizeMultiplier, color: colors.muted },
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity style={styles.themeButton} onPress={handleToggleTheme}>
          <IconSymbol
            name={(colorScheme === "light" ? "moon.fill" : "sun.fill") as never}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoArea}>
            <Text style={styles.appName}>輕鬆點餐</Text>
            <Text style={styles.tagline}>餐飲訂單管理系統</Text>
          </View>

          {/* Mode Toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, loginMode === "store" && styles.tabActive]}
              onPress={() => setLoginMode("store")}
            >
              <Text style={[styles.tabText, loginMode === "store" && styles.tabTextActive]}>
                店家登入
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === "admin" && styles.tabActive]}
              onPress={() => setLoginMode("admin")}
            >
              <Text style={[styles.tabText, loginMode === "admin" && styles.tabTextActive]}>
                管理員登入
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Text style={styles.label}>
            {loginMode === "store" ? "手機號碼" : "帳號"}
          </Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(text) => {
              if (loginMode === "store") {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setUsername(cleaned);
              } else {
                setUsername(text);
              }
            }}
            placeholder={loginMode === "store" ? "10 碼手機號碼" : "請輸入帳號"}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={loginMode === "store" ? "numeric" : "default"}
            returnKeyType="next"
          />

          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="請輸入密碼"
            placeholderTextColor={colors.muted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Remember Password */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <IconSymbol name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>記住密碼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {loginMode === "admin" ? "管理員登入" : "登入"}
              </Text>
            )}
          </TouchableOpacity>

          {loginMode === "store" && (
            <Text style={styles.hint}>如需開通帳號，請聯繫系統管理員</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
