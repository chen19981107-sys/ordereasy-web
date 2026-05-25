import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, TouchableOpacity } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAppAuth } from "@/lib/auth-context";
import { useThemeContext } from "@/lib/theme-provider";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, isLoading } = useAppAuth();
  const { colorScheme, setColorScheme } = useThemeContext();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  useEffect(() => {
    if (!isLoading && role !== "store") {
      router.replace("/login");
    }
  }, [role, isLoading]);

  const handleToggleTheme = () => {
    setColorScheme(colorScheme === "light" ? "dark" : "light");
  };

  if (isLoading || role !== "store") return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 0.5,
        },
        headerTitleStyle: {
          color: colors.foreground,
          fontWeight: "800",
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={handleToggleTheme}
            style={{
              marginRight: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <IconSymbol
              name={(colorScheme === "light" ? "moon.fill" : "sun.fill") as never}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        ),
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "訂單",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "菜單",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "統計",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="storefront.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "帳號",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "行事曆",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />

      <Tabs.Screen
        name="menu-overview"
        options={{
          title: "餐點總覽",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
