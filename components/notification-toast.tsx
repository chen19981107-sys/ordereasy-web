import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

export interface NotificationToastProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "info" | "warning" | "error";
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Floating notification toast component
 * Displays at the top of the screen with animation
 */
export function NotificationToast({
  visible,
  title,
  message,
  type = "info",
  duration = 4000,
  onDismiss,
}: NotificationToastProps) {
  const colors = useColors();
  const [isVisible, setIsVisible] = useState(visible);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Slide in
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        dismissNotification();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const dismissNotification = () => {
    // Slide out
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  if (!isVisible) return null;

  const typeColors = {
    success: { bg: colors.success, text: "#fff" },
    info: { bg: colors.primary, text: "#fff" },
    warning: { bg: colors.warning, text: "#fff" },
    error: { bg: colors.error, text: "#fff" },
  };

  const typeColor = typeColors[type];

  const styles = StyleSheet.create({
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
    },
    toast: {
      marginHorizontal: 16,
      marginTop: 60,
      borderRadius: 12,
      backgroundColor: typeColor.bg,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: typeColor.text,
      marginBottom: 4,
    },
    message: {
      fontSize: 14,
      fontWeight: "500",
      color: typeColor.text,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}
