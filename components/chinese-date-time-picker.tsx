import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ChineseDateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function ChineseDateTimePicker({
  value,
  onChange,
  onClose,
}: ChineseDateTimePickerProps) {
  const colors = useColors();
  const [tempDate, setTempDate] = useState(value);

  const handleDateChange = (year: number, month: number, day: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(year);
    newDate.setMonth(month);
    newDate.setDate(day);
    setTempDate(newDate);
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const newDate = new Date(tempDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    onClose();
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      color: colors.muted,
      fontSize: 14,
    },
    pickerRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 16,
      gap: 8,
    },
    pickerColumn: {
      flex: 1,
      height: 150,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    pickerItem: {
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    pickerItemText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
    },
    pickerItemSelected: {
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
    },
    pickerItemSelectedText: {
      color: colors.primary,
      fontWeight: "700",
    },
    confirmButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 16,
    },
    confirmButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });

  const currentYear = tempDate.getFullYear();
  const currentMonth = tempDate.getMonth();
  const currentDay = tempDate.getDate();
  const currentHours = tempDate.getHours();
  const currentMinutes = tempDate.getMinutes();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>選擇日期時間</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>取消</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      <View style={styles.pickerRow}>
        {/* Year */}
        <ScrollView style={styles.pickerColumn}>
          {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.pickerItem,
                year === currentYear && styles.pickerItemSelected,
              ]}
              onPress={() => handleDateChange(year, currentMonth, Math.min(currentDay, 28))}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  year === currentYear && styles.pickerItemSelectedText,
                ]}
              >
                {year}年
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Month */}
        <ScrollView style={styles.pickerColumn}>
          {MONTHS.map((month, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.pickerItem,
                idx === currentMonth && styles.pickerItemSelected,
              ]}
              onPress={() => handleDateChange(currentYear, idx, Math.min(currentDay, 28))}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  idx === currentMonth && styles.pickerItemSelectedText,
                ]}
              >
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Day */}
        <ScrollView style={styles.pickerColumn}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.pickerItem,
                day === currentDay && styles.pickerItemSelected,
              ]}
              onPress={() => handleDateChange(currentYear, currentMonth, day)}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  day === currentDay && styles.pickerItemSelectedText,
                ]}
              >
                {day}日
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Time Picker */}
      <View style={styles.pickerRow}>
        {/* Hours */}
        <ScrollView style={styles.pickerColumn}>
          {HOURS.map((hour) => (
            <TouchableOpacity
              key={hour}
              style={[
                styles.pickerItem,
                hour === currentHours && styles.pickerItemSelected,
              ]}
              onPress={() => handleTimeChange(hour, currentMinutes)}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  hour === currentHours && styles.pickerItemSelectedText,
                ]}
              >
                {hour.toString().padStart(2, "0")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Minutes */}
        <ScrollView style={styles.pickerColumn}>
          {MINUTES.map((minute) => (
            <TouchableOpacity
              key={minute}
              style={[
                styles.pickerItem,
                minute === currentMinutes && styles.pickerItemSelected,
              ]}
              onPress={() => handleTimeChange(currentHours, minute)}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  minute === currentMinutes && styles.pickerItemSelectedText,
                ]}
              >
                {minute.toString().padStart(2, "0")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>確定</Text>
      </TouchableOpacity>
    </View>
  );
}
