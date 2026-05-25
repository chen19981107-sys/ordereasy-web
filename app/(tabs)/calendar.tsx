import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { trpc } from "@/lib/trpc";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CalendarScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [venueRent, setVenueRent] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<"holiday" | "event" | "special">("event");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const calendarQuery = trpc.calendar.list.useQuery({
    startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
    endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
  });

  // 查詢每日營業額
  const dailyStatsQuery = trpc.stats.daily.useQuery({
    targetDate: selectedDate.toISOString().split('T')[0],
  });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      setDeliveryLocation("");
      setVenueRent("");
      setEventDescription("");
      setEventType("event");
    },
  });

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
    },
  });

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      setDeliveryLocation("");
      setVenueRent("");
      setEventDescription("");
      setEventType("event");
      setEditingId(null);
    },
  });

  const handleAddEvent = async () => {
    if (!deliveryLocation.trim()) {
      Alert.alert("提示", "請輸入出車地點");
      return;
    }

    setIsSubmitting(true);
    try {
      const venueRentalAmount = venueRent.trim() ? parseInt(venueRent) * 100 : 0;
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          eventDate: selectedDate.toISOString(),
          title: deliveryLocation.trim(),
          description: eventDescription.trim() || undefined,
          eventType,
          venueRental: venueRentalAmount,
        });
        Alert.alert("成功", "事件已更新");
      } else {
        await createMutation.mutateAsync({
          eventDate: selectedDate.toISOString(),
          title: deliveryLocation.trim(),
          description: eventDescription.trim() || undefined,
          eventType,
          venueRental: venueRentalAmount,
        });
        Alert.alert("成功", "事件已新增");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失敗";
      Alert.alert("錯誤", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (eventId: number) => {
    Alert.alert("確認刪除", "您確定要刪除此事件嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: eventId });
          } catch (err) {
            const message = err instanceof Error ? err.message : "刪除失敗";
            Alert.alert("錯誤", message);
          }
        },
      },
    ]);
  };

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20 * fontSizeMultiplier,
      fontWeight: "800",
      color: colors.foreground,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    monthText: {
      fontSize: 16 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.foreground,
    },
    navButton: {
      padding: 8,
    },
    calendar: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 24,
    },
    weekDays: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    weekDayText: {
      flex: 1,
      textAlign: "center",
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.muted,
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: "14.28%",
      aspectRatio: 1,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    dayButton: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayText: {
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
    },
    selectedDay: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    selectedDayText: {
      color: "#fff",
    },
    noEventDay: {
      backgroundColor: "#ef4444",
      borderColor: "#ef4444",
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.muted,
      marginBottom: 12,
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
    typeButton: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 12,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    typeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeOptionText: {
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
    },
    typeOptionTextActive: {
      color: "#fff",
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
    eventItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    eventContent: {
      flex: 1,
    },
    eventDate: {
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.muted,
      marginBottom: 4,
    },
    eventTitle: {
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.foreground,
    },
    eventDescription: {
      fontSize: 12 * fontSizeMultiplier,
      color: colors.muted,
      marginTop: 4,
    },
    deleteButton: {
      padding: 8,
    },
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, () => 0);

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>行事曆</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              const prev = new Date(currentDate);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentDate(prev);
            }}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.monthText}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              const next = new Date(currentDate);
              next.setMonth(next.getMonth() + 1);
              setCurrentDate(next);
            }}
          >
            <IconSymbol name="chevron.right" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="spinner"
            onChange={(_, date) => {
              if (date) setCurrentDate(date);
              setShowDatePicker(false);
            }}
          />
        )}

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          <View style={styles.weekDays}>
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {emptyDays.map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {days.map((day) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const isSelected = formatDate(date) === formatDate(selectedDate);
              const hasEvent = calendarQuery.data?.some(
                (event) => formatDate(new Date(event.eventDate)) === formatDate(date)
              );

              const dayButtonStyle = [styles.dayButton, isSelected && styles.selectedDay, !isSelected && !hasEvent && styles.noEventDay];
              const dayTextStyle = [styles.dayText, isSelected && styles.selectedDayText];
              
              if (!isSelected && !hasEvent) {
                dayTextStyle.push({ color: "#fff" });
              }

              return (
                <View key={day} style={styles.dayCell}>
                  <TouchableOpacity
                    style={dayButtonStyle}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={dayTextStyle}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Add Event Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新增事件</Text>

          <TextInput
            style={styles.input}
            placeholder="出車地點"
            placeholderTextColor={colors.muted}
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
            maxLength={100}
          />

          <TextInput
            style={styles.input}
            placeholder="場租（選填）"
            placeholderTextColor={colors.muted}
            value={venueRent}
            onChangeText={setVenueRent}
            keyboardType="numeric"
            maxLength={10}
          />

          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            placeholder="事件描述（選填）"
            placeholderTextColor={colors.muted}
            value={eventDescription}
            onChangeText={setEventDescription}
            multiline
            maxLength={200}
          />

          <TouchableOpacity
            style={[styles.button, isSubmitting && { opacity: 0.7 }]}
            onPress={handleAddEvent}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{editingId ? "更新事件" : "新增事件"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Events List */}
        {calendarQuery.data && calendarQuery.data.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>本月事件</Text>

            {(() => {
              // 按日期排序，優先顯示選擇的日期事件，只顯示當月事件
              const selectedDateStr = selectedDate.toISOString().split('T')[0];
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth();
              
              // 篩選只顯示當月的事件
              const currentMonthEvents = calendarQuery.data.filter(event => {
                const eventDate = new Date(event.eventDate);
                return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
              });
              
              const sortedEvents = [...currentMonthEvents].sort((a, b) => {
                const aDateStr = new Date(a.eventDate).toISOString().split('T')[0];
                const bDateStr = new Date(b.eventDate).toISOString().split('T')[0];
                
                // 優先顯示選擇的日期
                if (aDateStr === selectedDateStr && bDateStr !== selectedDateStr) return -1;
                if (aDateStr !== selectedDateStr && bDateStr === selectedDateStr) return 1;
                
                // 按日期排序
                return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
              });
              
              return sortedEvents.map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventDate}>
                    {(() => {
                      const d = new Date(event.eventDate);
                      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
                    })()}
                    </Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.venueRental ? (
                      <Text style={styles.eventDescription}>場租：${(event.venueRental / 100).toFixed(0)}元</Text>
                    ) : null}
                    {(() => {
                      const eventDateStr = new Date(event.eventDate).toISOString().split('T')[0];
                      const selectedDateStr = selectedDate.toISOString().split('T')[0];
                      if (eventDateStr === selectedDateStr && dailyStatsQuery.data) {
                        return (
                          <Text style={styles.eventDescription}>當日營業額：${(dailyStatsQuery.data.totalRevenue / 100).toFixed(0)}元</Text>
                        );
                      }
                      return null;
                    })()}
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        setEditingId(event.id as number);
                        setDeliveryLocation(event.title);
                        setVenueRent(event.venueRental ? (event.venueRental / 100).toString() : "");
                        setEventDescription(event.description || "");
                        setEventType(event.eventType as "holiday" | "event" | "special");
                        setSelectedDate(new Date(event.eventDate));
                      }}
                    >
                      <IconSymbol name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(event.id as number)}
                    >
                      <IconSymbol name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ));
            })()}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
