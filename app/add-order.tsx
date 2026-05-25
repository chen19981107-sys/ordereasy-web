// import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function AddOrderScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const { storeInfo } = useAppAuth();
  const utils = trpc.useUtils();

  const now = new Date();
  const [pickupTime, setPickupTime] = useState(() => {
    const t = new Date();
    t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5);
    t.setSeconds(0, 0);
    return t;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | string | null>(null);
  const [menuItemQuantity, setMenuItemQuantity] = useState<number>(1);
  const [customItemPrice, setCustomItemPrice] = useState<string>("");
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState<Array<{ id: number; quantity: number; customPrice?: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [phoneLastThree, setPhoneLastThree] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMenuItem = () => {
    if (!selectedMenuItemId) {
      Alert.alert("提示", "請先選擇餐點");
      return;
    }
    
    if (selectedMenuItemId === 'other') {
      if (!customItemPrice.trim()) {
        Alert.alert("提示", "請輸入金額");
        return;
      }
      const price = Math.round(parseFloat(customItemPrice) * 100);
      if (isNaN(price) || price < 0) {
        Alert.alert("提示", "金額必須是有效的數字");
        return;
      }
      setSelectedMenuItems([...selectedMenuItems, {
        id: -1,
        quantity: menuItemQuantity,
        customPrice: price,
      }]);
      setSelectedMenuItemId(null);
      setMenuItemQuantity(1);
      setCustomItemPrice("");
      return;
    }
    
    const selectedItem = menuItems.find(m => m.id === (selectedMenuItemId as number));
    if (!selectedItem) return;
    
    if (selectedItem.isCustomPrice && !customItemPrice.trim()) {
      Alert.alert("提示", "請輸入自訂價格");
      return;
    }
    
    const newItem: typeof selectedMenuItems[0] = {
      id: selectedMenuItemId as number,
      quantity: menuItemQuantity,
    };
    
    if (selectedItem.isCustomPrice) {
      const price = Math.round(parseFloat(customItemPrice) * 100);
      if (isNaN(price) || price < 0) {
        Alert.alert("提示", "價格必須是有效的數字");
        return;
      }
      newItem.customPrice = price;
    }
    
    setSelectedMenuItems([...selectedMenuItems, newItem]);
    setSelectedMenuItemId(null);
    setMenuItemQuantity(1);
    setCustomItemPrice("");
  };

  const handleRemoveMenuItem = (id: number, index?: number) => {
    if (id === -1 && index !== undefined) {
      // 移除特定索引的「其他」項目
      setSelectedMenuItems(selectedMenuItems.filter((_, i) => i !== index));
    } else {
      // 移除所有相同 ID 的項目
      setSelectedMenuItems(selectedMenuItems.filter((m) => m.id !== id));
    }
  };

  // 查詢菜單
  const { data: menuItems = [] } = trpc.menu.list.useQuery(
    undefined,
    { enabled: !!storeInfo?.storeId }
  );

  // 查詢當日出車地點
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const { data: todayEvents } = trpc.calendar.list.useQuery(
    { startDate: today, endDate: tomorrow },
    { enabled: !!storeInfo?.storeId }
  );

  const todayDeliveryLocation = todayEvents?.find((event) => {
    const eventDate = new Date(event.eventDate).toISOString().split('T')[0];
    return eventDate === today;
  })?.title || null;

  const createMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
    },
  });

  const selectedMenuItem = selectedMenuItemId === 'other' ? null : menuItems.find(item => item.id === selectedMenuItemId);
  const mealContent = selectedMenuItem ? `${selectedMenuItem.name} x${menuItemQuantity}` : "";
  
  // 計算訂單總金額
  const totalPrice = selectedMenuItems.reduce((sum, item) => {
    // 處理「其他」選項
    if (item.id === -1) {
      return sum + (item.customPrice || 0);
    }
    const menuItem = menuItems.find(m => m.id === item.id);
    if (!menuItem) return sum;
    const itemPrice = item.customPrice !== undefined ? item.customPrice : menuItem.price;
    return sum + (itemPrice * item.quantity);
  }, 0);
  const totalPriceDisplay = Math.round(totalPrice / 100);

  const handleSubmit = async () => {
    if (selectedMenuItems.length === 0) {
      Alert.alert("提示", "請至少選擇一項餐點");
      return;
    }
    
    // 檢查是否只有「其他」選項
    const hasOnlyOther = selectedMenuItems.every(item => item.id === -1);
    
    if (!hasOnlyOther) {
      if (!customerName.trim()) {
        Alert.alert("提示", "請輸入姓氏");
        return;
      }
      if (!phoneLastThree.trim()) {
        Alert.alert("提示", "請輸入手機末三碼");
        return;
      }
      if (phoneLastThree.length !== 3 || !/^\d{3}$/.test(phoneLastThree)) {
        Alert.alert("提示", "請輸入正確的手機末三碼（3位數字）");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const mealContentStr = selectedMenuItems
        .map((item) => {
          if (item.id === -1) {
            return `其他 x${item.quantity}`;
          }
          const menuItem = menuItems.find((m) => m.id === item.id);
          return menuItem ? `${menuItem.name} x${item.quantity}` : "";
        })
        .filter(Boolean)
        .join(", ");

      // 計算訂單總金額和總份數
      const totalPrice = selectedMenuItems.reduce((sum, item) => {
        if (item.id === -1) {
          return sum + (item.customPrice || 0);
        }
        const menuItem = menuItems.find((m) => m.id === item.id);
        const itemPrice = item.customPrice !== undefined ? item.customPrice : (menuItem?.price || 0);
        return sum + (itemPrice * item.quantity);
      }, 0);
      const totalQuantity = selectedMenuItems.reduce((sum, item) => sum + item.quantity, 0);

      await createMutation.mutateAsync({
        pickupTime: pickupTime.toISOString(),
        mealContent: mealContentStr,
        phoneLastThree: hasOnlyOther ? undefined : phoneLastThree,
        customerNote: customerName,
        note: note.trim() || undefined,
        status: "making",
        totalPrice,
        totalQuantity,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "新增失敗，請稍後再試";
      Alert.alert("錯誤", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (d: Date) => {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatFullDate = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const date = d.getDate().toString().padStart(2, "0");
    const time = formatTime(d);
    return `${year}年${month}月${date}日 ${time}`;
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 20 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground, flex: 1 },
    section: { marginHorizontal: 16, marginTop: 24 },
    label: { fontSize: 13 * fontSizeMultiplier, fontWeight: "700", color: colors.muted, marginBottom: 8 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16 * fontSizeMultiplier,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    timeButtonText: { fontSize: 18 * fontSizeMultiplier, fontWeight: "700", color: colors.primary },
    phoneInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 18 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: "center",
      letterSpacing: 4,
    },
    submitButton: {
      margin: 24,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
    },
    submitText: { color: "#fff", fontSize: 18 * fontSizeMultiplier, fontWeight: "800" },
    menuScrollView: {
      marginHorizontal: 0,
    },
    menuScrollContent: {
      paddingHorizontal: 16,
      gap: 8,
      paddingRight: 16,
    },
    menuItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 110,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    menuItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    menuItemName: {
      fontWeight: "600",
      color: colors.foreground,
      fontSize: 14 * fontSizeMultiplier,
    },
    menuItemNameActive: {
      color: "#fff",
    },
    menuItemPrice: {
      fontSize: 12 * fontSizeMultiplier,
      color: colors.muted,
      marginTop: 4,
    },
    menuItemPriceActive: {
      color: "#fff",
    },
    timePickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    timePickerHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      alignItems: "center",
    },
    timePickerTitle: {
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.foreground,
    },
    timePickerLabels: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
    },
    timePickerLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.muted,
    },
    timePickerRow: {
      flexDirection: "row",
      height: 150 * fontSizeMultiplier,
      gap: 4,
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    timePickerColumn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timePickerItem: {
      height: 40 * fontSizeMultiplier,
      justifyContent: "center",
      alignItems: "center",
    },
    timePickerItemActive: {
      backgroundColor: colors.primary + "20",
    },
    timePickerItemText: {
      fontSize: 13 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
    },
    timePickerItemTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    timePickerConfirmButton: {
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    timePickerConfirmButtonText: {
      color: "#fff",
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新增訂單</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Pickup Time */}
          <View style={styles.section}>
            <Text style={styles.label}>取餐時間</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>{formatFullDate(pickupTime)}</Text>
              <IconSymbol name="clock.fill" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>選擇取餐時間</Text>
              </View>
              
              <View style={styles.timePickerLabels}>
                <Text style={styles.timePickerLabel}>日</Text>
                <Text style={styles.timePickerLabel}>時</Text>
                <Text style={styles.timePickerLabel}>分</Text>
              </View>
              
              <View style={styles.timePickerRow}>
                {/* Day Picker */}
                <ScrollView style={styles.timePickerColumn}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.timePickerItem,
                        day === pickupTime.getDate() && styles.timePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(pickupTime);
                        newDate.setDate(day);
                        setPickupTime(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePickerItemText,
                          day === pickupTime.getDate() && styles.timePickerItemTextActive,
                        ]}
                      >
                        {day.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Hour Picker (24-hour format) */}
                <ScrollView style={styles.timePickerColumn}>
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timePickerItem,
                        hour === pickupTime.getHours() && styles.timePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(pickupTime);
                        newDate.setHours(hour);
                        setPickupTime(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePickerItemText,
                          hour === pickupTime.getHours() && styles.timePickerItemTextActive,
                        ]}
                      >
                        {hour.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Minute Picker (5-minute intervals) */}
                <ScrollView style={styles.timePickerColumn}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.timePickerItem,
                        minute === Math.floor(pickupTime.getMinutes() / 5) * 5 && styles.timePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(pickupTime);
                        newDate.setMinutes(minute);
                        setPickupTime(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePickerItemText,
                          minute === Math.floor(pickupTime.getMinutes() / 5) * 5 && styles.timePickerItemTextActive,
                        ]}
                      >
                        {minute.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <TouchableOpacity
                style={styles.timePickerConfirmButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerConfirmButtonText}>確定</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delivery Location */}
          {todayDeliveryLocation && (
            <View style={styles.section}>
              <Text style={styles.label}>📍 當日出車地點</Text>
              <View style={[styles.input, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>
                  {todayDeliveryLocation}
                </Text>
              </View>
            </View>
          )}

          {/* Meal Content - Menu Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>選擇餐點</Text>
            {menuItems.length === 0 ? (
              <View style={[styles.input, { justifyContent: "center", alignItems: "center", minHeight: 60 }]}>
                <Text style={{ color: colors.muted, fontSize: 14 }}>沒有可用的餐點</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                  onPress={() => setShowMenuPicker(true)}
                >
                  <Text style={{ fontWeight: "600", color: selectedMenuItemId ? colors.foreground : colors.muted }}>
                    {selectedMenuItemId === 'other'
                      ? '其他 - 自訂金額'
                      : selectedMenuItemId
                      ? menuItems.find((m) => m.id === selectedMenuItemId)?.name
                      : "請選擇餐點"}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>▼</Text>
                </TouchableOpacity>

                {showMenuPicker && (
                  <View style={styles.timePickerContainer}>
                    <ScrollView
                      style={styles.timePickerRow}
                      showsVerticalScrollIndicator={false}
                      scrollEventThrottle={16}
                    >
                      {menuItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.timePickerItem,
                            selectedMenuItemId === item.id && styles.timePickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedMenuItemId(item.id);
                            setMenuItemQuantity(1);
                            setCustomItemPrice("");
                          }}
                        >
                          <Text
                            style={[
                              styles.timePickerItemText,
                              selectedMenuItemId === item.id && styles.timePickerItemTextActive,
                            ]}
                          >
                            {item.name} - {item.isCustomPrice ? '自訂價格' : `$${item.price / 100}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[
                          styles.timePickerItem,
                          selectedMenuItemId === 'other' && styles.timePickerItemActive,
                        ]}
                        onPress={() => {
                          setSelectedMenuItemId('other' as any);
                          setMenuItemQuantity(1);
                          setCustomItemPrice("");
                        }}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            selectedMenuItemId === 'other' && styles.timePickerItemTextActive,
                          ]}
                        >
                          其他 - 自訂金額
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.timePickerConfirmButton}
                      onPress={() => setShowMenuPicker(false)}
                    >
                      <Text style={styles.timePickerConfirmButtonText}>確定</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            {(selectedMenuItem || selectedMenuItemId === 'other') && (
              <View style={[styles.input, { backgroundColor: colors.primary + "20", marginTop: 12 }]}>
                <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                  {selectedMenuItemId === 'other' ? '其他' : selectedMenuItem?.name}
                </Text>
                {(selectedMenuItem?.isCustomPrice || selectedMenuItemId === 'other') && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12, marginBottom: 8 }}>
                      {selectedMenuItemId === 'other' ? '金額 (元):' : '自訂價格 (元):'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: colors.foreground,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      placeholder="例：50"
                      placeholderTextColor={colors.muted}
                      value={customItemPrice}
                      onChangeText={setCustomItemPrice}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>數量:</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setMenuItemQuantity(Math.max(1, menuItemQuantity - 1))}
                  >
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16, minWidth: 30, textAlign: "center" }}>
                    {menuItemQuantity}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setMenuItemQuantity(menuItemQuantity + 1)}
                  >
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: "center",
                  }}
                  onPress={handleAddMenuItem}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>新增</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedMenuItems.length > 0 && (
              <View style={[styles.input, { marginTop: 12 }]}>
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                  已選餐點 ({selectedMenuItems.length})
                </Text>
                {selectedMenuItems.map((item, index) => {
                  const menuItem = menuItems.find((m) => m.id === item.id);
                  const itemName = item.id === -1 ? '其他' : menuItem?.name;
                  const itemPrice = item.id === -1 ? (item.customPrice || 0) / 100 : (item.customPrice !== undefined ? item.customPrice : menuItem?.price || 0) / 100;
                  return (
                    <View key={`${item.id}-${index}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View>
                        <Text style={{ color: colors.foreground, fontSize: 14 }}>
                          {itemName} x{item.quantity}
                        </Text>
                        {item.id === -1 && (
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                            ${itemPrice.toFixed(0)}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveMenuItem(item.id, index)}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ color: colors.error, fontWeight: "600", fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Customer Name */}
          <View style={styles.section}>
            <Text style={styles.label}>姓氏 <Text style={{ color: colors.error }}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="例：王先生、小美小姓"
              placeholderTextColor={colors.muted}
              maxLength={20}
              returnKeyType="done"
            />
          </View>

          {/* Phone Last 3 Digits */}
          <View style={styles.section}>
            <Text style={styles.label}>手機末三碼 <Text style={{ color: colors.error }}>*</Text></Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneLastThree}
              onChangeText={(t) => setPhoneLastThree(t.replace(/\D/g, "").slice(0, 3))}
              placeholder="000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
            />
          </View>

          {/* Note (optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>備註（選填）</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="例：不要辣、加湯"
              placeholderTextColor={colors.muted}
              maxLength={200}
              returnKeyType="done"
            />
          </View>



          {/* Total Price Display */}
          {selectedMenuItems.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }]}>
              <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>訂單金額</Text>
              <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "700" }}>
                ${totalPriceDisplay}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>新增訂單</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
