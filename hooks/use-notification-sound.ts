import { useEffect, useRef } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { generateOscillatorSound } from "@/lib/sound-generator";

type SoundType = "default" | "crisp" | "gentle" | "urgent";
type VibrationPattern = "light" | "medium" | "strong";

/**
 * Hook to manage notification sound and vibration
 * Provides methods to play notification with sound and haptics
 */
export function useNotificationSound() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize audio session
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (err) {
        console.error("Failed to set audio mode:", err);
      }
    })();

    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  /**
   * Get sound file based on sound type
   * Falls back to generated sound if file doesn't exist
   */
  const getSoundFile = (soundType: SoundType = "default") => {
    const soundMap: Record<SoundType, any> = {
      default: require("@/assets/sounds/notification.wav"),
      crisp: require("@/assets/sounds/notification.wav"),
      gentle: require("@/assets/sounds/notification.wav"),
      urgent: require("@/assets/sounds/notification.wav"),
    };
    return soundMap[soundType] || soundMap.default;
  };

  /**
   * Get haptic feedback based on vibration pattern
   */
  const getHapticFeedback = async (pattern: VibrationPattern = "medium") => {
    if (Platform.OS === "web") return;

    try {
      switch (pattern) {
        case "light":
          // 短暫輕微震動
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          // 中等強度震動
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "strong":
          // 強力震動
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await new Promise(resolve => setTimeout(resolve, 100));
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (err) {
      console.error("Haptic feedback error:", err);
    }
  };

  /**
   * Play notification with optional sound and haptics
   */
  const playNotification = async (options: {
    soundEnabled?: boolean;
    soundType?: SoundType;
    vibrationEnabled?: boolean;
    vibrationPattern?: VibrationPattern;
  } = {}) => {
    const {
      soundEnabled = true,
      soundType = "default",
      vibrationEnabled = true,
      vibrationPattern = "medium",
    } = options;

    try {
      // Play sound if enabled
      if (soundEnabled && !isPlayingRef.current) {
        isPlayingRef.current = true;

        try {
          // Try to load file first, fall back to generated sound
          let sound: Audio.Sound | null = null;

          try {
            if (!soundRef.current) {
              const soundFile = getSoundFile(soundType);
              const { sound: loadedSound } = await Audio.Sound.createAsync(soundFile);
              soundRef.current = loadedSound;
            }
            sound = soundRef.current;
          } catch (fileErr) {
            console.warn("Failed to load sound file, using generated sound:", fileErr);
            // Fall back to generated sound
            sound = await generateOscillatorSound(soundType);
          }

          if (sound) {
            // Play the sound
            await sound.playAsync();

            // Reset flag after sound finishes
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                isPlayingRef.current = false;
              }
            });
          }
        } catch (err) {
          console.error("Failed to play sound:", err);
          isPlayingRef.current = false;
        }
      }

      // Trigger haptics if enabled
      if (vibrationEnabled) {
        await getHapticFeedback(vibrationPattern);
      }
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  /**
   * Stop current notification
   */
  const stopNotification = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        isPlayingRef.current = false;
      }
    } catch (err) {
      console.error("Failed to stop sound:", err);
    }
  };

  return {
    playNotification,
    stopNotification,
  };
}
