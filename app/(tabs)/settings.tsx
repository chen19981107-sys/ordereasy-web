import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [lineGroupId, setLineGroupId] = useState("");
  const [postAuthorName, setPostAuthorName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const settingsQuery = trpc.settings.get.useQuery();
  const updateSettingsMutation = trpc.settings.update.useMutation();
  const lineGroupQuery = trpc.lineGroup.getGroupId.useQuery();
  const setLineGroupIdMutation = trpc.lineGroup.setGroupId.useMutation();
  const postAuthorQuery = trpc.lineGroup.getPostAuthorName.useQuery();
  const setPostAuthorMutation = trpc.lineGroup.setPostAuthorName.useMutation();

  useEffect(() => {
    if (settingsQuery.isLoading === false) {
      if (settingsQuery.data) {
        setNotificationSound(settingsQuery.data.notificationSoundEnabled ?? true);
        setNotificationVibration(settingsQuery.data.notificationVibrationEnabled ?? true);
      }
      setIsLoading(false);
    }
  }, [settingsQuery.isLoading, settingsQuery.data]);

  useEffect(() => {
    if (lineGroupQuery.data?.groupId) {
      setLineGroupId(lineGroupQuery.data.groupId);
    }
  }, [lineGroupQuery.data]);

  useEffect(() => {
    if (postAuthorQuery.data?.authorName) {
      setPostAuthorName(postAuthorQuery.data.authorName);
    }
  }, [postAuthorQuery.data]);

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

  const handleSaveLineGroupId = async () => {
    if (!lineGroupId.trim()) {
      Alert.alert("錯誤", "請輸入 LINE 群組 ID");
      return;
    }
    setIsSaving(true);
    try {
      await setLineGroupIdMutation.mutateAsync({ groupId: lineGroupId });
      Alert.alert("成功", "LINE 群組 ID 已保存，系統將自動監聽該群組的訂單留言");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失敗";
      Alert.alert("錯誤", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePostAuthorName = async () => {
    if (!postAuthorName.trim()) {
      Alert.alert("錯誤", "請輸入貼文帳號名稱");
      return;
    }
    setIsSaving(true);
    try {
      await setPostAuthorMutation.mutateAsync({ authorName: postAuthorName });
      Alert.alert("成功", "貼文帳號名稱已保存，系統將只監聽該帳號發布的貼文");
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
      // 組件卸載時，確保最新的字體大小已保存到後端
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
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
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

        {/* LINE Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINE 群組記事本設定</Text>
          <Text style={{ fontSize: 14 * fontSizeMultiplier, color: colors.muted, marginBottom: 12 }}>
            輸入要監聽的 LINE 群組 ID，系統會自動抓取該群組記事本貼文下的訂單留言。顧客在貼文下留言「姓名 取餐時間 餐點內容」格式的訂單，系統會自動建立。
          </Text>
          <TextInput
            style={styles.input}
            placeholder="輸入 LINE 群組 ID"
            value={lineGroupId}
            onChangeText={setLineGroupId}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            style={[styles.button, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveLineGroupId}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>保存群組設定</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>貼文帳號名稱</Text>
          <Text style={{ fontSize: 14 * fontSizeMultiplier, color: colors.muted, marginBottom: 12 }}>
            輸入要監聽的貼文帳號名稱，系統只會監聽該帳號發布的貼文下的訂單留言。
          </Text>
          <TextInput
            style={styles.input}
            placeholder="輸入貼文帳號名稱"
            value={postAuthorName}
            onChangeText={setPostAuthorName}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            style={[styles.button, isSaving && { opacity: 0.7 }]}
            onPress={handleSavePostAuthorName}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>保存帳號名稱</Text>
            )}
          </TouchableOpacity>
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
