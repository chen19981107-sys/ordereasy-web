import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { manus_upload_file } from "@/lib/utils";

export default function MenuScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", imageUrl: "" });
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: menuItems, isLoading, refetch } = trpc.menu.list.useQuery();

  const createMutation = trpc.menu.create.useMutation({
    onSuccess: () => {
      setFormData({ name: "", price: "", imageUrl: "" });
      setShowForm(false);
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = trpc.menu.update.useMutation({
    onSuccess: () => {
      setFormData({ name: "", price: "", imageUrl: "" });
      setEditingId(null);
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = trpc.menu.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        try {
          const asset = result.assets[0];
          const filename = asset.uri.split("/").pop() || "image.jpg";
          
          // 上傳圖片到 S3
          const uploadResult = await manus_upload_file(asset.uri);
          if (uploadResult && uploadResult.length > 0) {
            setFormData(prev => ({ ...prev, imageUrl: uploadResult[0] }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      Alert.alert("錯誤", "上傳圖片失敗，請稍後再試");
    }
  }, []);

  const handleAddItem = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert("錯誤", "請輸入品名");
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert("錯誤", "請輸入價格");
      return;
    }

    const price = Math.round(parseFloat(formData.price) * 100);
    if (isNaN(price) || price < 0) {
      Alert.alert("錯誤", "價格必須是有效的數字");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        price,
        imageUrl: formData.imageUrl || null,

      });
    } catch (error) {
      Alert.alert("錯誤", "新增失敗，請稍後再試");
    }
  }, [formData, createMutation]);

  const handleUpdateItem = useCallback(async () => {
    if (!editingId) return;
    if (!formData.name.trim()) {
      Alert.alert("錯誤", "請輸入品名");
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert("錯誤", "請輸入價格");
      return;
    }

    const price = Math.round(parseFloat(formData.price) * 100);
    if (isNaN(price) || price < 0) {
      Alert.alert("錯誤", "價格必須是有效的數字");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        name: formData.name.trim(),
        price,
        imageUrl: formData.imageUrl || null,

      });
    } catch (error) {
      Alert.alert("錯誤", "更新失敗，請稍後再試");
    }
  }, [editingId, formData, updateMutation]);

  const handleDeleteItem = useCallback((id: number) => {
    Alert.alert("確認刪除", "確定要刪除此品項嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Alert.alert("錯誤", "刪除失敗，請稍後再試");
          }
        },
      },
    ]);
  }, [deleteMutation]);

  const handleEditItem = useCallback((item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      price: (item.price / 100).toString(),
      imageUrl: item.imageUrl || "",
    });
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", price: "", imageUrl: "" });
  }, []);

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
    headerTitle: { fontSize: 22 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyTitle: { fontSize: 16 * fontSizeMultiplier, fontWeight: "600", color: colors.foreground, marginTop: 12 },
    emptyText: { fontSize: 13 * fontSizeMultiplier, color: colors.muted, marginTop: 4 },
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      gap: 12,
    },
    menuImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    menuInfo: {
      flex: 1,
      justifyContent: "space-between",
    },
    menuName: { fontSize: 16 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground },
    menuPrice: { fontSize: 14 * fontSizeMultiplier, fontWeight: "600", color: colors.primary, marginTop: 4 },
    menuActions: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "flex-end",
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.border,
    },
    formContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formTitle: { fontSize: 16 * fontSizeMultiplier, fontWeight: "700", color: colors.foreground, marginBottom: 12 },
    formGroup: { marginBottom: 12 },
    label: { fontSize: 13 * fontSizeMultiplier, fontWeight: "600", color: colors.foreground, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imagePickerButton: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 100,
    },
    imagePreview: {
      width: "100%",
      height: 100,
      borderRadius: 8,
      marginBottom: 8,
    },
    formButtons: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    submitButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    submitButtonText: { fontSize: 14 * fontSizeMultiplier, fontWeight: "600", color: "#fff" },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.border,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButtonText: { fontSize: 14 * fontSizeMultiplier, fontWeight: "600", color: colors.foreground },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>菜單管理</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <IconSymbol name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Form */}
        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editingId ? "編輯品項" : "新增品項"}
            </Text>

            {/* Image Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>品項圖片</Text>
              {formData.imageUrl ? (
                <>
                  <Image
                    source={{ uri: formData.imageUrl }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={{ color: colors.muted }}>更換圖片</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <IconSymbol name="photo.fill" size={32} color={colors.muted} />
                      <Text style={{ color: colors.muted, marginTop: 8 }}>點擊上傳圖片</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>品名</Text>
              <TextInput
                style={styles.input}
                placeholder="例：紅茶"
                placeholderTextColor={colors.muted}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                returnKeyType="next"
              />
            </View>

            {/* Price */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>價格（元）</Text>
              <TextInput
                style={styles.input}
                placeholder="例：50"
                placeholderTextColor={colors.muted}
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                editable={true}
              />
            </View>


            {/* Buttons */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={editingId ? handleUpdateItem : handleAddItem}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingId ? "更新" : "新增"}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu List */}
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : menuItems && menuItems.length > 0 ? (
          <FlatList
            data={menuItems}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.menuCard}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.menuImage}
                  />
                )}
                <View style={styles.menuInfo}>
                  <View>
                    <Text style={styles.menuName}>{item.name}</Text>
                    <Text style={styles.menuPrice}>
                      ${(item.price / 100).toFixed(0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.menuActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditItem(item)}
                  >
                    <IconSymbol name="pencil" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <IconSymbol name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="list.bullet" size={64} color={colors.muted} />
            <Text style={styles.emptyTitle}>尚未有品項</Text>
            <Text style={styles.emptyText}>點擊右上角「+」新增第一項品項</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
