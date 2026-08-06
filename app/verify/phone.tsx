import { Text, View, TextInput, Pressable, Alert } from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PhoneVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(90);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Hata", "Lütfen 6 haneli doğrulama kodunu girin.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      setTimeout(() => {
        router.back();
      }, 2000);
    }, 1500);
  };

  const handleResend = () => {
    setTimer(90);
    Alert.alert("Gönderildi", "Yeni doğrulama kodu telefonunuza SMS olarak gönderildi.");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (verified) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.success + "15",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <IconSymbol name="checkmark" size={36} color={colors.success} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
            Telefon Doğrulandı!
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
            Telefon numaranız başarıyla doğrulandı. Yönlendiriliyorsunuz...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

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
          Telefon Doğrulama
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ flex: 1, padding: 24, alignItems: "center" }}>
        {/* Icon */}
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: colors.success + "12",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 30,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 32 }}>📱</Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          SMS Doğrulama Kodu
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 30 }}>
          +90 5XX XXX XX XX numarasına gönderilen 6 haneli kodu girin.
        </Text>

        {/* OTP Input */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              value={digit}
              onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
              keyboardType="number-pad"
              maxLength={1}
              style={{
                width: 48,
                height: 56,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: digit ? colors.success : colors.border,
                backgroundColor: digit ? colors.success + "05" : colors.surface,
                textAlign: "center",
                fontSize: 22,
                fontWeight: "bold",
                color: colors.foreground,
              }}
            />
          ))}
        </View>

        {/* Timer */}
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
          Kod geçerlilik süresi: {formatTime(timer)}
        </Text>

        {/* Verify Button */}
        <Pressable
          onPress={handleVerify}
          disabled={loading}
          style={({ pressed }) => [
            {
              width: "100%",
              backgroundColor: loading ? colors.muted : colors.success,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: "center",
              opacity: pressed && !loading ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
            {loading ? "Doğrulanıyor..." : "Doğrula"}
          </Text>
        </Pressable>

        {/* Resend */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Kod gelmedi mi? </Text>
          <Pressable onPress={handleResend}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Tekrar Gönder</Text>
          </Pressable>
        </View>

        {/* Call option */}
        <Pressable onPress={() => Alert.alert("Arama", "Doğrulama kodu sesli arama ile gönderilecek.")} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13, textDecorationLine: "underline" }}>
            Sesli arama ile kod al
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
