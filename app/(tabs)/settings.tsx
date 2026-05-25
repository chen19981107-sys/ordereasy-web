import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAppAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { FontSizeSlider } from "@/components/font-size-slider";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const colors = useColors();
  const { logout } = useAppAuth();
  const { fontSizeMultiplier, setFontSizeMultiplier } = useFontSize();

  const [notificationSound, setNotificationSound] = useState(true);
  const [notificationVibration, setNotificationVibration] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const settingsQuery = trpc.settings.get.useQuery();
  const updateSettingsMutation = trpc.settings.update.useMutation();

  useEffect(() => {
    if (settingsQuery.isLoading === false) {
      if (settingsQuery.data) {
        setNotificationSound(settingsQuery.data.notificationSoundEnabled ?? true);
        setNotificationVibration(settingsQuery.data.notificationVibrationEnabled ?? true);
      }
      setIsLoading(false);
    }
  }, [settingsQuery.isLoading, settingsQuery.data]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        notificationSoundEnabled: notificationSound,
        notificationVibrationEnabled: notificationVibration,
      });
      Alert.alert("成功", "設定已保存");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失敗";
      Alert.alert("錯誤", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFontSizeChange = async (value: number) => {
    // 立即保存到本地
    await setFontSizeMultiplier(value);

    // 自動保存到後端（無需用戶確認）
    try {
      await updateSettingsMutation.mutateAsync({
        fontSizeMultiplier: value,
      });
    } catch (err) {
      console.warn("Failed to save font size to backend:", err);
    }
  };

  // 在組件卸載時確保已保存
  useEffect(() => {
    return () => {
      if (settingsQuery.data && fontSizeMultiplier !== (settingsQuery.data.fontSizeMultiplier ?? 1.0)) {
        updateSettingsMutation.mutate({
          fontSizeMultiplier,
        });
      }
    };
  }, [fontSizeMultiplier]);

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20 * fontSizeMultiplier,
      fontWeight: "800",
      color: colors.foreground,
      flex: 1,
    },
    section: {
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 13 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.muted,
      marginBottom: 12,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    settingLabel: {
      fontSize: 16 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
      flex: 1,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 12,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16 * fontSizeMultiplier,
      fontWeight: "700",
    },
  });

  if (isLoading) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Font Size Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>字體大小</Text>
          <FontSizeSlider
            value={fontSizeMultiplier}
            onChange={handleFontSizeChange}
          />
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知設定</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>提示音效</Text>
            <Switch
              value={notificationSound}
              onValueChange={setNotificationSound}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>震動提示</Text>
            <Switch
              value={notificationVibration}
              onValueChange={setNotificationVibration}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>保存通知設定</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
