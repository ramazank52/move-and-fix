import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

function formatDuration(milliseconds: number | null | undefined) {
  const seconds = Math.max(0, Math.round((milliseconds ?? 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VoiceAudioBubble({
  uri,
  durationMs,
  isOwn,
}: {
  uri: string;
  durationMs: number | null | undefined;
  isOwn: boolean;
}) {
  const colors = useColors();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const foreground = isOwn ? "#FFFFFF" : colors.foreground;
  const secondary = isOwn ? "#FFFFFFB3" : colors.muted;
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
    player.play();
  };

  return (
    <View style={{ minWidth: 184, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Sesli mesajı duraklat" : "Sesli mesajı oynat"}
          onPress={togglePlayback}
          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
        >
          <IconSymbol name={status.playing ? "pause.circle.fill" : "play.circle.fill"} size={30} color={foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ height: 3, borderRadius: 999, overflow: "hidden", backgroundColor: isOwn ? "#FFFFFF55" : colors.border }}>
            <View style={{ width: `${Math.max(progress * 100, 2)}%`, height: "100%", backgroundColor: foreground }} />
          </View>
          <Text style={{ marginTop: 4, color: secondary, fontSize: 11 }}>
            {status.playing ? formatDuration(Math.round(status.currentTime * 1000)) : formatDuration(durationMs)}
          </Text>
        </View>
      </View>
    </View>
  );
}
