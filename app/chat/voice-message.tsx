import { Text, View, Pressable, ScrollView, Alert, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

interface VoiceMessage {
  id: string;
  sender: string;
  duration: number;
  timestamp: string;
  played: boolean;
  audioUrl: string;
}

const VOICE_MESSAGES: VoiceMessage[] = [
  {
    id: "1",
    sender: "Ahmet Yılmaz",
    duration: 23,
    timestamp: "14:32",
    played: true,
    audioUrl: "https://example.com/voice1.m4a",
  },
  {
    id: "2",
    sender: "You",
    duration: 15,
    timestamp: "14:35",
    played: true,
    audioUrl: "https://example.com/voice2.m4a",
  },
  {
    id: "3",
    sender: "Ahmet Yılmaz",
    duration: 31,
    timestamp: "14:38",
    played: false,
    audioUrl: "https://example.com/voice3.m4a",
  },
];

export default function VoiceMessageScreen() {
  const colors = useColors();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Başarılı", "Sesli mesajınız gönderildi!");
  };

  const handlePlayMessage = (id: string) => {
    setPlayingId(playingId === id ? null : id);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
          Sesli Mesajlar
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Messages */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {VOICE_MESSAGES.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: msg.sender === "You" ? colors.primary + "15" : colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: msg.sender === "You" ? colors.primary + "30" : colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: msg.sender === "You" ? colors.primary : colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFF" }}>
                  {msg.sender === "You" ? "S" : msg.sender.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                  {msg.sender}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                  {msg.timestamp} • {formatTime(msg.duration)}
                </Text>
              </View>
              <Pressable
                onPress={() => handlePlayMessage(msg.id)}
                style={({ pressed }) => [
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: playingId === msg.id ? colors.primary : colors.border + "40",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>
                  {playingId === msg.id ? "⏸" : "▶"}
                </Text>
              </Pressable>
              {!msg.played && msg.sender !== "You" && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                    marginLeft: 8,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        {/* Recording Section */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Sesli Mesaj Kaydet
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {isRecording ? (
            <>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.error + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.error + "30",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>🎙️</Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.error, marginBottom: 12 }}>
                {formatTime(recordingTime)}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
                Kaydediliyor...
              </Text>
              <Pressable
                onPress={handleStopRecording}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.error,
                    borderRadius: 10,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Gönder</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🎙️</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 16, textAlign: "center" }}>
                Sesli mesaj kaydetmek için başla
              </Text>
              <Pressable
                onPress={handleStartRecording}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Kayıt Başla</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
