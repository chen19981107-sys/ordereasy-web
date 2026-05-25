import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { useCallback, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-context";
import { useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function DashboardScreen() {
  const colors = useColors();
  const { fontSizeMultiplier } = useFontSize();
  const { storeInfo } = useAppAuth();
  const [period, setPeriod] = useState<"daily" | "yesterday" | "weekly" | "monthly" | "yearly" | "custom" | "range" | "historical">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rangeStartDate, setRangeStartDate] = useState(new Date());
  const [rangeEndDate, setRangeEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState<"start" | "end" | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dailyStats, isLoading: isDailyLoading, refetch: refetchDaily } = trpc.stats.daily.useQuery(
    { targetDate: new Date().toISOString().split('T')[0] },
    { refetchInterval: 30000, staleTime: 0 }
  );

  const { data: weeklyStats, isLoading: isWeeklyLoading, refetch: refetchWeekly } = trpc.stats.weekly.useQuery(undefined, {
    refetchInterval: 300000,
  });

  const { data: monthlyStats, isLoading: isMonthlyLoading, refetch: refetchMonthly } = trpc.stats.monthly.useQuery(undefined, {
    refetchInterval: 300000,
  });

  const { data: historicalStats, isLoading: isHistoricalLoading, refetch: refetchHistorical } = trpc.stats.historical.useQuery(undefined, {
    refetchInterval: 3600000,
  });





  // 昔日統計
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: yesterdayStats, isLoading: isYesterdayLoading, refetch: refetchYesterday } = trpc.stats.daily.useQuery(
    { targetDate: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })() },
    {
      enabled: period === "yesterday",
      refetchInterval: 60000,
    }
  );

  // 自定義日期統計
  const { data: customStats, isLoading: isCustomLoading, refetch: refetchCustom } = trpc.stats.daily.useQuery(
    { targetDate: selectedDate.toISOString().split('T')[0] },
    {
      enabled: period === "custom",
      refetchInterval: 60000,
    }
  );

  // 日期範圍統計
  const { data: rangeStats, isLoading: isRangeLoading, refetch: refetchRange } = trpc.stats.range.useQuery(
    { 
      startDate: rangeStartDate.toISOString().split('T')[0],
      endDate: rangeEndDate.toISOString().split('T')[0],
    },
    {
      enabled: period === "range",
      refetchInterval: 60000,
    }
  );

  // 更新 handleRefresh 以包含所有可能的查詢
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const promises = [
        refetchDaily(),
        refetchWeekly(),
        refetchMonthly(),
        refetchHistorical(),
      ];
      if (period === "yesterday") promises.push(refetchYesterday());
      if (period === "custom") promises.push(refetchCustom());
      if (period === "range") promises.push(refetchRange());
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchDaily, refetchWeekly, refetchMonthly, refetchHistorical, refetchYesterday, refetchCustom, refetchRange, period]);

  const isLoading = 
    period === "daily" ? isDailyLoading : 
    period === "yesterday" ? isYesterdayLoading :
    period === "weekly" ? isWeeklyLoading :
    period === "monthly" ? isMonthlyLoading : 
    period === "custom" ? isCustomLoading :
    period === "range" ? isRangeLoading :
    isHistoricalLoading;

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  const formatChineseDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}年${month}月${day}日`;
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22 * fontSizeMultiplier, fontWeight: "800", color: colors.foreground },
    headerSub: { fontSize: 13 * fontSizeMultiplier, color: colors.muted, marginTop: 2 },
    periodToggle: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 6,
      overflow: "hidden",
      justifyContent: "space-between",
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    periodButtonText: {
      fontSize: 11 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
    },
    periodButtonTextActive: {
      color: "#fff",
    },
    customDateRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      alignItems: "center",
    },
    customDateButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    customDateButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.foreground,
    },
    datePickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    datePickerHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      alignItems: "center",
    },
    datePickerTitle: {
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
      color: colors.foreground,
    },
    datePickerRow: {
      flexDirection: "row",
      height: 150,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    datePickerColumn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    datePickerItem: {
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    datePickerItemActive: {
      backgroundColor: colors.primary + "20",
    },
    datePickerItemText: {
      fontSize: 13 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.foreground,
    },
    datePickerItemTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    datePickerConfirmButton: {
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    datePickerConfirmButtonText: {
      color: "#fff",
      fontSize: 14 * fontSizeMultiplier,
      fontWeight: "700",
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    statsGrid: {
      gap: 12,
    },
    statCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statLabel: {
      fontSize: 13 * fontSizeMultiplier,
      fontWeight: "600",
      color: colors.muted,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 28 * fontSizeMultiplier,
      fontWeight: "800",
      color: colors.primary,
    },
    statUnit: {
      fontSize: 12 * fontSizeMultiplier,
      fontWeight: "500",
      color: colors.muted,
      marginTop: 4,
    },
    yearCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    yearLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    yearStats: {
      alignItems: "flex-end",
    },
    yearValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
    },
    yearSubtext: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" className="">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>營業統計</Text>
        <Text style={styles.headerSub}>{storeInfo?.storeName ?? "店家"}</Text>
      </View>

      {/* Period Toggle - Fixed Layout */}
      <View style={styles.periodToggle}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "daily" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("daily")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "daily" && styles.periodButtonTextActive,
            ]}
          >
            今日
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "yesterday" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("yesterday")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "yesterday" && styles.periodButtonTextActive,
            ]}
          >
            昨日
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "weekly" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("weekly")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "weekly" && styles.periodButtonTextActive,
            ]}
          >
            本周
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "monthly" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("monthly")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "monthly" && styles.periodButtonTextActive,
            ]}
          >
            本月
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "yearly" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("yearly" as any)}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "yearly" && styles.periodButtonTextActive,
            ]}
          >
            今年
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "historical" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("historical")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "historical" && styles.periodButtonTextActive,
            ]}
          >
            三年
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "custom" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("custom")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "custom" && styles.periodButtonTextActive,
            ]}
          >
            選擇日期
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === "range" && styles.periodButtonActive,
          ]}
          onPress={() => setPeriod("range")}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === "range" && styles.periodButtonTextActive,
            ]}
          >
            日期範圍
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Picker */}
      {period === "range" && (
        <View>
          <View style={styles.customDateRow}>
            <TouchableOpacity
              style={styles.customDateButton}
              onPress={() => setShowRangePicker("start")}
            >
              <Text style={styles.customDateButtonText}>
                起：{formatChineseDate(rangeStartDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customDateButton}
              onPress={() => setShowRangePicker("end")}
            >
              <Text style={styles.customDateButtonText}>
                訖：{formatChineseDate(rangeEndDate)}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showRangePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {showRangePicker === "start" ? "選擇起始日期" : "選擇結束日期"}
                </Text>
              </View>
              
              <View style={styles.datePickerRow}>
                {/* Year Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 10 }, (_, i) => (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getFullYear() - 5 + i).map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        year === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getFullYear() && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(showRangePicker === "start" ? rangeStartDate : rangeEndDate);
                        newDate.setFullYear(year);
                        if (showRangePicker === "start") {
                          setRangeStartDate(newDate);
                        } else {
                          setRangeEndDate(newDate);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          year === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getFullYear() && styles.datePickerItemTextActive,
                        ]}
                      >
                        {year}年
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Month Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const chineseMonths = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
                    return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        month === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getMonth() + 1 && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(showRangePicker === "start" ? rangeStartDate : rangeEndDate);
                        newDate.setMonth(month - 1);
                        if (showRangePicker === "start") {
                          setRangeStartDate(newDate);
                        } else {
                          setRangeEndDate(newDate);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          month === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getMonth() + 1 && styles.datePickerItemTextActive,
                        ]}
                      >
                        {chineseMonths[month - 1]}月
                      </Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                {/* Day Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        day === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getDate() && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(showRangePicker === "start" ? rangeStartDate : rangeEndDate);
                        newDate.setDate(day);
                        if (showRangePicker === "start") {
                          setRangeStartDate(newDate);
                        } else {
                          setRangeEndDate(newDate);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          day === (showRangePicker === "start" ? rangeStartDate : rangeEndDate).getDate() && styles.datePickerItemTextActive,
                        ]}
                      >
                        {day}日
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => setShowRangePicker(null)}
              >
                <Text style={styles.datePickerConfirmButtonText}>確定</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Custom Date Picker */}
      {period === "custom" && (
        <View>
          <View style={styles.customDateRow}>
            <TouchableOpacity
              style={styles.customDateButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.customDateButtonText}>
                {formatChineseDate(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>選擇日期</Text>
              </View>
              
              <View style={styles.datePickerRow}>
                {/* Year Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 10 }, (_, i) => selectedDate.getFullYear() - 5 + i).map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        year === selectedDate.getFullYear() && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(year);
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          year === selectedDate.getFullYear() && styles.datePickerItemTextActive,
                        ]}
                      >
                        {year}年
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Month Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const chineseMonths = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
                    return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        month === selectedDate.getMonth() + 1 && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(month - 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          month === selectedDate.getMonth() + 1 && styles.datePickerItemTextActive,
                        ]}
                      >
                        {chineseMonths[month - 1]}月
                      </Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                {/* Day Picker */}
                <ScrollView style={styles.datePickerColumn}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        day === selectedDate.getDate() && styles.datePickerItemActive,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(day);
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          day === selectedDate.getDate() && styles.datePickerItemTextActive,
                        ]}
                      >
                        {day}日
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerConfirmButtonText}>確定</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshAll}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : period === "historical" ? (
          <View>
            {historicalStats && historicalStats.length > 0 ? (
              historicalStats.map((stat) => (
                <View key={stat.year} style={styles.yearCard}>
                  <Text style={styles.yearLabel}>{stat.year}年</Text>
                  <View style={styles.yearStats}>
                    <Text style={styles.yearValue}>
                      ${(stat.totalRevenue / 100).toFixed(0)}
                    </Text>
                    <Text style={styles.yearSubtext}>
                      {stat.totalOrders}筆訂單
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: "center", color: colors.muted }}>
                無歷史紀錄
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Order Count */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>訂單筆數</Text>
              <Text style={styles.statValue}>
                {period === "daily" ? dailyStats?.completedOrders ?? 0 : 
                 period === "yesterday" ? yesterdayStats?.completedOrders ?? 0 :
                 period === "weekly" ? weeklyStats?.completedOrders ?? 0 :
                 period === "custom" ? customStats?.completedOrders ?? 0 :
                 period === "range" ? rangeStats?.completedOrders ?? 0 :
                 monthlyStats?.completedOrders ?? 0}
              </Text>
              <Text style={styles.statUnit}>筆</Text>
            </View>

            {/* Total Quantity */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>訂單份數</Text>
              <Text style={styles.statValue}>
                {period === "daily" ? dailyStats?.totalQuantity ?? 0 : 
                 period === "yesterday" ? yesterdayStats?.totalQuantity ?? 0 :
                 period === "weekly" ? weeklyStats?.totalQuantity ?? 0 :
                 period === "custom" ? customStats?.totalQuantity ?? 0 :
                 period === "range" ? rangeStats?.totalQuantity ?? 0 :
                 monthlyStats?.totalQuantity ?? 0}
              </Text>
              <Text style={styles.statUnit}>份</Text>
            </View>

            {/* Revenue */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>營業額</Text>
              <Text style={styles.statValue}>
                ${
                  (
                    period === "daily" ? dailyStats?.totalRevenue ?? 0 :
                    period === "yesterday" ? yesterdayStats?.totalRevenue ?? 0 :
                    period === "weekly" ? weeklyStats?.totalRevenue ?? 0 :
                    period === "custom" ? customStats?.totalRevenue ?? 0 :
                    period === "range" ? rangeStats?.totalRevenue ?? 0 :
                    monthlyStats?.totalRevenue ?? 0
                  ) / 100
                }
              </Text>
              <Text style={styles.statUnit}>元</Text>
            </View>

            {/* Average Price Per Order */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>每筆訂單均價</Text>
              <Text style={styles.statValue}>
                ${
                  (() => {
                    const totalOrders = period === "daily" ? dailyStats?.totalOrders ?? 0 :
                                        period === "yesterday" ? yesterdayStats?.totalOrders ?? 0 :
                                        period === "weekly" ? weeklyStats?.totalOrders ?? 0 :
                                        period === "custom" ? customStats?.totalOrders ?? 0 :
                                        period === "range" ? rangeStats?.totalOrders ?? 0 :
                                        monthlyStats?.totalOrders ?? 0;
                    const totalRevenue = period === "daily" ? dailyStats?.totalRevenue ?? 0 :
                                        period === "yesterday" ? yesterdayStats?.totalRevenue ?? 0 :
                                        period === "weekly" ? weeklyStats?.totalRevenue ?? 0 :
                                        period === "custom" ? customStats?.totalRevenue ?? 0 :
                                        period === "range" ? rangeStats?.totalRevenue ?? 0 :
                                        monthlyStats?.totalRevenue ?? 0;
                    return totalOrders > 0 ? ((totalRevenue / 100) / totalOrders).toFixed(0) : 0;
                  })()
                }
              </Text>
              <Text style={styles.statUnit}>元</Text>
            </View>

            {/* Venue Rent */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>場租</Text>
              <Text style={styles.statValue}>
                ${
                  (
                    period === "daily" ? dailyStats?.venueRental ?? 0 :
                    period === "yesterday" ? yesterdayStats?.venueRental ?? 0 :
                    period === "weekly" ? weeklyStats?.venueRental ?? 0 :
                    period === "custom" ? customStats?.venueRental ?? 0 :
                    period === "range" ? rangeStats?.venueRental ?? 0 :
                    monthlyStats?.venueRental ?? 0
                  ) / 100
                }
              </Text>
              <Text style={styles.statUnit}>元</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
