import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface FontSizeSliderProps {
  value: number; // 0.8 to 2.5
  onChange: (value: number) => void;
  onRelease?: (value: number) => void;
}

export function FontSizeSlider({
  value,
  onChange,
  onRelease,
}: FontSizeSliderProps) {
  const colors = useColors();

  const sizes = [
    { label: "小", value: 0.8 },
    { label: "中", value: 1.2 },
    { label: "大", value: 2.5 },
  ];

  const handleSizeChange = (newValue: number) => {
    onChange(newValue);
    if (onRelease) {
      onRelease(newValue);
    }
  };

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 12,
    },
    buttonsContainer: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
    },
    buttonTextActive: {
      color: "#fff",
    },
    previewContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.muted,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    previewText: {
      fontSize: 14 * value,
      color: colors.foreground,
      lineHeight: (14 * value) * 1.5,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>字體大小</Text>

      <View style={styles.buttonsContainer}>
        {sizes.map((size) => (
          <Pressable
            key={size.label}
            style={[
              styles.button,
              value === size.value && styles.buttonActive,
            ]}
            onPress={() => handleSizeChange(size.value)}
          >
            <Text
              style={[
                styles.buttonText,
                value === size.value && styles.buttonTextActive,
              ]}
            >
              {size.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>預覽</Text>
        <Text style={styles.previewText}>字體大小預覽文本</Text>
      </View>
    </View>
  );
}
