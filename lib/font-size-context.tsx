import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FontSizeContextType {
  fontSizeMultiplier: number;
  setFontSizeMultiplier: (value: number) => Promise<void>;
  isLoading: boolean;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const FONT_SIZE_STORAGE_KEY = "app_font_size_multiplier";
const DEFAULT_FONT_SIZE = 1.0;

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSizeMultiplier, setFontSizeMultiplierState] = useState(DEFAULT_FONT_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  // Load font size from storage on mount
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const stored = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
        if (stored) {
          const value = parseFloat(stored);
          if (!isNaN(value) && value >= 0.8 && value <= 2.5) {
            setFontSizeMultiplierState(value);
          }
        }
      } catch (error) {
        console.warn("Failed to load font size:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFontSize();
  }, []);

  const setFontSizeMultiplier = async (value: number) => {
    // Clamp value between 0.8 and 2.5
    const clampedValue = Math.max(0.8, Math.min(2.5, value));
    setFontSizeMultiplierState(clampedValue);

    try {
      await AsyncStorage.setItem(
        FONT_SIZE_STORAGE_KEY,
        clampedValue.toFixed(2)
      );
    } catch (error) {
      console.warn("Failed to save font size:", error);
    }
  };

  return (
    <FontSizeContext.Provider
      value={{
        fontSizeMultiplier,
        setFontSizeMultiplier,
        isLoading,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within FontSizeProvider");
  }
  return context;
}
