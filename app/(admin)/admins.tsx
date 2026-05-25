import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function AdminsScreen() {
  const colors = useColors();

  const { data: admins, isLoading, refetch } = trpc.admin.admins.list.useQuery();

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
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
    card: {
      marginHorizontal: 16,
      marginVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardContent: {
      flex: 1,
    },
    cardUsername: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    cardDate: { fontSize: 12, color: colors.muted },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 12,
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>管理員列表</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(admin)/add-admin" as never)}
        >
          <IconSymbol name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Admins List */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !admins || admins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>還沒有管理員</Text>
          <Text style={styles.emptyText}>點擊 + 新增管理員帳號</Text>
        </View>
      ) : (
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardUsername}>{item.username}</Text>
                <Text style={styles.cardDate}>
                  建立於 {new Date(item.createdAt).toLocaleDateString("zh-TW")}
                </Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <IconSymbol name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </ScreenContainer>
  );
}
