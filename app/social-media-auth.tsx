import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { getApiBaseUrl } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { useAppAuth } from "@/lib/auth-context";

export default function SocialMediaAuthScreen() {
  const colors = useColors();
  const { platform } = useLocalSearchParams<{ platform: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const { storeInfo } = useAppAuth();
  const updateSocialMediaMutation = trpc.socialMedia.update.useMutation();

  const handleAuthorize = async () => {
    if (!storeInfo) {
      Alert.alert("錯誤", "無法取得店家資訊");
      return;
    }

    setIsLoading(true);
    try {
      if (platform === "line") {
        await handleLINEAuthorize();
      } else if (platform === "facebook") {
        Alert.alert("提示", "Facebook 授權功能即將實現");
      }
    } catch (error) {
      console.error("Authorization error:", error);
      Alert.alert("錯誤", error instanceof Error ? error.message : "授權失敗，請稍後重試");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLINEAuthorize = async () => {
    if (!storeInfo) throw new Error("Store info not available");

    const apiBaseUrl = getApiBaseUrl();
    const redirectUri = `${apiBaseUrl}/api/line/oauth/callback`;
    const state = Math.random().toString(36).substring(7);

    const lineChannelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;
    if (!lineChannelId) {
      throw new Error("LINE Channel ID not configured");
    }

    const authUrl = `https://web.line.biz/web/login/wait?loginChannelId=${lineChannelId}&redirectUri=${encodeURIComponent(redirectUri)}&state=${state}`;

    // Open browser for LINE authorization
    const result = await WebBrowser.openBrowserAsync(authUrl);

    // WebBrowser.openBrowserAsync returns type 'opened' or 'cancel'
    if (result.type === "opened") {
      // For LINE OAuth, save the channel ID
      // The actual token exchange will happen through the backend webhook
      await updateSocialMediaMutation.mutateAsync({
        storeId: storeInfo.storeId,
        lineChannelId: lineChannelId,
      });

      Alert.alert("成功", "LINE 帳號連接成功");
      router.back();
    } else if (result.type === "cancel") {
      throw new Error("授權已取消");
    }
  };

  const getTitle = () => {
    if (platform === "facebook") return "連動 Facebook";
    if (platform === "line") return "連動 LINE";
    return "連動社群媒體";
  };

  const getDescription = () => {
    if (platform === "facebook") return "授權後可抓取粉絲專頁下的留言訂單";
    if (platform === "line") return "授權後可抓取官方帳號下的訊息訂單";
    return "";
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.foreground,
      marginBottom: 10,
    },
    description: {
      fontSize: 16,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 20,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      width: "100%",
      alignItems: "center",
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButton: {
      backgroundColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 8,
      width: "100%",
      alignItems: "center",
    },
    cancelButtonText: {
      color: colors.foreground,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.description}>{getDescription()}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuthorize}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "授權中..." : "前往授權"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
