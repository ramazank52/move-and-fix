import { Text, View, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  provider: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
  icon: string;
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "1", date: "2026-08-10", title: "Banyo Tesisatı", category: "Su Tesisatı", provider: "Ahmet Yılmaz", time: "14:00", status: "scheduled", icon: "🔧" },
  { id: "2", date: "2026-08-12", title: "Elektrik Panosu", category: "Elektrik", provider: "Mehmet Demir", time: "10:00", status: "scheduled", icon: "⚡" },
  { id: "3", date: "2026-08-05", title: "Salon Boyama", category: "Boya", provider: "Ali Kaya", time: "09:00", status: "completed", icon: "🎨" },
  { id: "4", date: "2026-08-03", title: "Klima Montajı", category: "Klima", provider: "Fatma Şahin", time: "13:00", status: "completed", icon: "❄️" },
  { id: "5", date: "2026-08-01", title: "Kapı Montajı", category: "Marangoz", provider: "Hasan Çelik", time: "11:00", status: "cancelled", icon: "🚪" },
];

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, () => 0);

  const selectedDateEvents = CALENDAR_EVENTS.filter(
    (event) => event.date === selectedDate
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Hizmet Takvimi
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Month Navigation */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable onPress={handlePrevMonth} style={{ padding: 4 }}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={18} color={colors.primary} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <Pressable onPress={handleNextMonth} style={{ padding: 4 }}>
            <IconSymbol name="chevron.right" size={18} color={colors.primary} />
          </Pressable>
        </View>

        {/* Calendar Grid */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Day Headers */}
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {DAYS.map((day) => (
              <View key={day} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {emptyDays.map((_, index) => (
              <View key={`empty-${index}`} style={{ width: "14.28%", aspectRatio: 1 }} />
            ))}
            {daysArray.map((day) => {
              const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
              const hasEvent = CALENDAR_EVENTS.some((e) => e.date === dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={({ pressed }) => [
                    {
                      width: "14.28%",
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.primary + "20" : hasEvent ? colors.success + "10" : "transparent",
                      borderWidth: isSelected ? 1.5 : hasEvent ? 1 : 0,
                      borderColor: isSelected ? colors.primary : colors.success,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? "600" : "500",
                      color: isSelected ? colors.primary : colors.foreground,
                    }}
                  >
                    {day}
                  </Text>
                  {hasEvent && (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colors.success,
                        marginTop: 2,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events */}
        {selectedDate && (
          <>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              {new Date(selectedDate).toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {selectedDateEvents.length > 0 ? (
              <View style={{ gap: 10 }}>
                {selectedDateEvents.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      backgroundColor:
                        event.status === "completed"
                          ? colors.success + "10"
                          : event.status === "cancelled"
                          ? colors.error + "10"
                          : colors.primary + "10",
                      borderRadius: 12,
                      padding: 12,
                      borderLeftWidth: 4,
                      borderLeftColor:
                        event.status === "completed"
                          ? colors.success
                          : event.status === "cancelled"
                          ? colors.error
                          : colors.primary,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>{event.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                          {event.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>{event.provider}</Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            event.status === "completed"
                              ? colors.success + "20"
                              : event.status === "cancelled"
                              ? colors.error + "20"
                              : colors.primary + "20",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color:
                              event.status === "completed"
                                ? colors.success
                                : event.status === "cancelled"
                                ? colors.error
                                : colors.primary,
                          }}
                        >
                          {event.status === "scheduled" && "Planlı"}
                          {event.status === "completed" && "Tamamlandı"}
                          {event.status === "cancelled" && "İptal"}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      🕐 {event.time} • {event.category}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                  Bu tarihte planlı hizmet yok
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
