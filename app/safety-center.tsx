import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type IncidentCategory = "conduct" | "identity" | "unsafe_condition" | "harassment" | "other";
type Severity = "low" | "medium" | "high" | "critical";

const categories: { value: IncidentCategory; label: string }[] = [
  { value: "conduct", label: "Davranış" },
  { value: "identity", label: "Kimlik" },
  { value: "unsafe_condition", label: "Güvensiz durum" },
  { value: "harassment", label: "Taciz" },
  { value: "other", label: "Diğer" },
];
const severities: { value: Severity; label: string }[] = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "critical", label: "Kritik" },
];

export default function SafetyCenterScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();
  const contactsQuery = trpc.safety.trustedContacts.useQuery();
  const incidentsQuery = trpc.safety.incidents.listMine.useQuery();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("unsafe_condition");
  const [severity, setSeverity] = useState<Severity>("medium");
  const createContact = trpc.safety.createTrustedContact.useMutation({
    onSuccess: async () => {
      setContactName(""); setContactPhone(""); setContactLabel(""); setShowContactForm(false);
      await utils.safety.trustedContacts.invalidate();
    },
    onError: (error) => Alert.alert("Kişi kaydedilemedi", error.message),
  });
  const revokeContact = trpc.safety.revokeTrustedContact.useMutation({
    onSuccess: () => utils.safety.trustedContacts.invalidate(),
    onError: (error) => Alert.alert("Kişi kaldırılamadı", error.message),
  });
  const reportIncident = trpc.safety.incidents.report.useMutation({
    onSuccess: async () => {
      setDescription(""); setShowIncidentForm(false);
      await utils.safety.incidents.listMine.invalidate();
      Alert.alert("Bildirim alındı", "Güvenlik bildiriminiz kaydedildi ve yetkili inceleme akışına iletildi.");
    },
    onError: (error) => Alert.alert("Bildirim gönderilemedi", error.message),
  });

  const submitContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert("Eksik bilgi", "Ad ve telefon alanlarını doldurun."); return;
    }
    createContact.mutate({ name: contactName.trim(), phone: contactPhone.trim(), label: contactLabel.trim() || undefined });
  };
  const submitIncident = () => {
    if (description.trim().length < 10) {
      Alert.alert("Daha fazla ayrıntı gerekli", "Olay bildirimini en az 10 karakterle açıklayın."); return;
    }
    reportIncident.mutate({ category, severity, description: description.trim() });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ marginLeft: 8, flex: 1, color: colors.foreground, fontSize: 17, fontWeight: "800" }}>Safety Center</Text>
        <IconSymbol name="exclamationmark.shield.fill" size={20} color={colors.error} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 42 }}>
        <View style={{ borderRadius: 18, padding: 17, borderWidth: 0.5, borderColor: `${colors.error}4D`, backgroundColor: `${colors.error}0D` }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="exclamationmark.shield.fill" size={24} color={colors.error} />
            <Text style={{ marginLeft: 10, flex: 1, color: colors.foreground, fontSize: 16, fontWeight: "900" }}>Acil durum desteği</Text>
          </View>
          <Text style={{ marginTop: 9, color: colors.muted, fontSize: 13, lineHeight: 19 }}>Hayati tehlike veya acil durum varsa uygulama içi bildirimi beklemeyin; Türkiye’de 112’yi arayın. Bu ekran, güvenilir kişiler ve hizmet güvenliği bildirimleri içindir.</Text>
        </View>

        <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>Güvenilir kişiler</Text>
          <Pressable onPress={() => setShowContactForm((value) => !value)} style={({ pressed }) => ({ borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}>
            <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "800" }}>{showContactForm ? "Kapat" : "Kişi Ekle"}</Text>
          </Pressable>
        </View>
        {showContactForm ? <View style={{ marginTop: 10, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
          <Field label="Ad soyad" value={contactName} onChangeText={setContactName} colors={colors} />
          <Field label="Telefon" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" colors={colors} />
          <Field label="İlişki / not (isteğe bağlı)" value={contactLabel} onChangeText={setContactLabel} colors={colors} />
          <ActionButton label={createContact.isPending ? "Kaydediliyor…" : "Güvenilir kişiyi kaydet"} disabled={createContact.isPending} onPress={submitContact} colors={colors} />
        </View> : null}
        {contactsQuery.isLoading ? <ActivityIndicator style={{ marginTop: 18 }} color={colors.primary} /> : contactsQuery.isError ? <LoadError onRetry={() => contactsQuery.refetch()} colors={colors} /> : (contactsQuery.data ?? []).length === 0 ? <EmptyCard text="Henüz güvenilir kişi eklemediniz." colors={colors} /> : (contactsQuery.data ?? []).map((contact) => (
          <View key={contact.id} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 14, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.success}18` }}><IconSymbol name="person.fill" size={17} color={colors.success} /></View>
            <View style={{ marginLeft: 10, flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "800" }}>{contact.label || "Güvenilir kişi"}</Text><Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }}>Kişisel iletişim bilgileri güvenli olarak saklanır.</Text></View>
            <Pressable disabled={revokeContact.isPending} onPress={() => Alert.alert("Kişiyi kaldır", "Bu kişiyi güvenilir kişilerden kaldırmak istiyor musunuz?", [{ text: "Vazgeç", style: "cancel" }, { text: "Kaldır", style: "destructive", onPress: () => revokeContact.mutate({ id: contact.id }) }])} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}><IconSymbol name="trash.fill" size={17} color={colors.error} /></Pressable>
          </View>
        ))}

        <View style={{ marginTop: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>Güvenlik bildirimi</Text>
          <Pressable onPress={() => setShowIncidentForm((value) => !value)} style={({ pressed }) => ({ borderRadius: 10, borderWidth: 1, borderColor: colors.error, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.error, fontSize: 12, fontWeight: "800" }}>{showIncidentForm ? "Kapat" : "Bildirim Yap"}</Text></Pressable>
        </View>
        {showIncidentForm ? <View style={{ marginTop: 10, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>KONU</Text>
          <ChoiceRow items={categories} selected={category} onSelect={setCategory} colors={colors} />
          <Text style={{ marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: "700" }}>ÖNCELİK</Text>
          <ChoiceRow items={severities} selected={severity} onSelect={setSeverity} colors={colors} />
          <TextInput multiline placeholder="Ne oldu? Lütfen yalnızca olayla ilgili bilgileri yazın." placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} style={{ minHeight: 108, marginTop: 12, padding: 12, color: colors.foreground, backgroundColor: colors.background, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, textAlignVertical: "top", fontSize: 13, lineHeight: 19 }} />
          <ActionButton label={reportIncident.isPending ? "Gönderiliyor…" : "Güvenlik bildirimini gönder"} disabled={reportIncident.isPending} onPress={submitIncident} colors={colors} danger />
        </View> : null}
        {incidentsQuery.isLoading ? <ActivityIndicator style={{ marginTop: 18 }} color={colors.primary} /> : incidentsQuery.isError ? <LoadError onRetry={() => incidentsQuery.refetch()} colors={colors} /> : (incidentsQuery.data ?? []).length === 0 ? <EmptyCard text="Henüz bir güvenlik bildiriminiz yok." colors={colors} /> : (incidentsQuery.data ?? []).map((incident) => (
          <View key={incident.id} style={{ marginTop: 10, borderRadius: 15, padding: 14, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{incident.category.replace(/_/g, " ")}</Text><Text style={{ color: incident.severity === "critical" || incident.severity === "high" ? colors.error : colors.warning, fontSize: 11, fontWeight: "800" }}>{incident.status}</Text></View>
            <Text style={{ marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18 }}>Bildirim ayrıntıları güvenli inceleme kaydında tutulur.</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, colors, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors>; keyboardType?: "default" | "phone-pad" }) {
  return <View style={{ marginBottom: 10 }}><Text style={{ marginBottom: 5, color: colors.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={colors.muted} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.foreground, backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border, fontSize: 14 }} /></View>;
}
function ActionButton({ label, onPress, disabled, colors, danger = false }: { label: string; onPress: () => void; disabled: boolean; colors: ReturnType<typeof useColors>; danger?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ marginTop: 4, minHeight: 43, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: danger ? colors.error : colors.primary, opacity: pressed || disabled ? 0.65 : 1 })}><Text style={{ color: "#FFF", fontWeight: "800" }}>{label}</Text></Pressable>;
}
function ChoiceRow<T extends string>({ items, selected, onSelect, colors }: { items: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void; colors: ReturnType<typeof useColors> }) {
  return <View style={{ marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{items.map((item) => <Pressable key={item.value} onPress={() => onSelect(item.value)} style={({ pressed }) => ({ borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: selected === item.value ? colors.primary : colors.border, backgroundColor: selected === item.value ? `${colors.primary}15` : "transparent", opacity: pressed ? 0.65 : 1 })}><Text style={{ color: selected === item.value ? colors.primary : colors.muted, fontSize: 11, fontWeight: "700" }}>{item.label}</Text></Pressable>)}</View>;
}
function EmptyCard({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) { return <View style={{ marginTop: 10, borderRadius: 15, padding: 15, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border }}><Text style={{ color: colors.muted, fontSize: 13 }}>{text}</Text></View>; }
function LoadError({ onRetry, colors }: { onRetry: () => void; colors: ReturnType<typeof useColors> }) { return <Pressable onPress={onRetry} style={({ pressed }) => ({ marginTop: 10, borderRadius: 15, padding: 15, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.error, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.error, fontSize: 13, fontWeight: "700", textAlign: "center" }}>Bilgiler yüklenemedi. Yeniden dene.</Text></Pressable>; }
