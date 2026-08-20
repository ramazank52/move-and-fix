import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

type StatusValue = "complete" | "selected" | "verified" | "approved" | "eligible";

function statusColor(value: string, colors: ReturnType<typeof useColors>) {
  return (value as StatusValue) === "complete" || (value as StatusValue) === "selected" ||
    (value as StatusValue) === "verified" || (value as StatusValue) === "approved" ||
    (value as StatusValue) === "eligible" ? "#22C55E" : colors.warning;
}

export default function ProviderOnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const lifecycleQuery = trpc.provider.getOnboardingStatus.useQuery(undefined, { refetchOnMount: true });
  const catalogQuery = trpc.provider.getOnboardingCatalog.useQuery(undefined, { refetchOnMount: true });
  const countryRegistryQuery = trpc.countryRegistry.list.useQuery(undefined, { refetchOnMount: true });
  const configureMutation = trpc.provider.configureOnboarding.useMutation();
  const submitOperatingModelMutation = trpc.provider.submitOperatingModel.useMutation();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [capabilityId, setCapabilityId] = useState<number | null>(null);
  const [jurisdictionCode, setJurisdictionCode] = useState<string | null>(null);
  const [operatingModel, setOperatingModel] = useState<"employee" | "self_employed" | "sole_trader" | "company_owner" | "company_worker">("self_employed");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("20");
  const operatingModelQuery = trpc.provider.getOperatingModel.useQuery(
    { jurisdictionCode: jurisdictionCode ?? "ZZ" },
    { enabled: Boolean(jurisdictionCode), refetchOnMount: true },
  );

  const categories = catalogQuery.data?.categories ?? [];
  const subcategories = useMemo(
    () => (catalogQuery.data?.subcategories ?? []).filter((item) => item.categoryId === categoryId),
    [catalogQuery.data?.subcategories, categoryId],
  );
  const capabilities = useMemo(
    () => (catalogQuery.data?.capabilities ?? []).filter(
      (item) => item.categoryId === categoryId && item.subcategoryId === subcategoryId,
    ),
    [catalogQuery.data?.capabilities, categoryId, subcategoryId],
  );
  const serviceArea = { latitude: Number(latitude), longitude: Number(longitude), radiusKm: Number(serviceRadiusKm) };
  const hasValidServiceArea = Number.isFinite(serviceArea.latitude) && serviceArea.latitude >= -90 && serviceArea.latitude <= 90 &&
    Number.isFinite(serviceArea.longitude) && serviceArea.longitude >= -180 && serviceArea.longitude <= 180 &&
    Number.isInteger(serviceArea.radiusKm) && serviceArea.radiusKm >= 1 && serviceArea.radiusKm <= 500;
  const operatingModelVerified = operatingModelQuery.data?.reviewStatus === "verified";

  const selectCategory = (id: number) => {
    setCategoryId(id);
    setSubcategoryId(null);
    setCapabilityId(null);
  };
  const selectSubcategory = (id: number) => {
    setSubcategoryId(id);
    setCapabilityId(null);
  };
  const submit = async () => {
    if (!categoryId || !capabilityId || !jurisdictionCode || !hasValidServiceArea || !operatingModelVerified || configureMutation.isPending) return;
    try {
      await configureMutation.mutateAsync({ categoryId, subcategoryId, capabilityId, jurisdictionCode, serviceArea });
      await Promise.all([utils.provider.getOnboardingStatus.invalidate(), utils.provider.getDocuments.invalidate(), utils.provider.getDocumentRequirements.invalidate()]);
      Alert.alert(t("provider.onboarding.setupSavedTitle"), t("provider.onboarding.setupSavedBody"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("provider.onboarding.setupFailedBody");
      Alert.alert(t("provider.onboarding.setupFailedTitle"), message);
    }
  };

  const submitOperatingModel = async () => {
    if (!jurisdictionCode || submitOperatingModelMutation.isPending) return;
    try {
      await submitOperatingModelMutation.mutateAsync({ jurisdictionCode, operatingModel });
      await Promise.all([operatingModelQuery.refetch(), lifecycleQuery.refetch()]);
      Alert.alert("İşletme modeli gönderildi", "İnceleme tamamlanana kadar aktivasyon güvenli biçimde beklemede kalır.");
    } catch (error) {
      Alert.alert(t("provider.onboarding.setupFailedTitle"), error instanceof Error ? error.message : t("provider.onboarding.setupFailedBody"));
    }
  };

  if (lifecycleQuery.isLoading || catalogQuery.isLoading || countryRegistryQuery.isLoading) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
      <ActivityIndicator size="large" color="#FF7A1A" />
    </ScreenContainer>;
  }
  if (lifecycleQuery.isError || catalogQuery.isError || countryRegistryQuery.isError || !lifecycleQuery.data || !catalogQuery.data) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-8">
      <IconSymbol name="wifi.exclamationmark" size={38} color={colors.error} />
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "800", marginTop: 12, textAlign: "center" }}>{t("provider.onboarding.loadErrorTitle")}</Text>
      <Pressable onPress={() => Promise.all([lifecycleQuery.refetch(), catalogQuery.refetch(), countryRegistryQuery.refetch()])} style={{ marginTop: 16, backgroundColor: "#FF7A1A", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 }}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>{t("provider.onboarding.retry")}</Text>
      </Pressable>
    </ScreenContainer>;
  }

  const status = lifecycleQuery.data;
  const steps = [
    [t("provider.onboarding.step.profile"), status.profile],
    [t("provider.onboarding.step.serviceScope"), status.canonicalService],
    [t("provider.onboarding.step.jurisdiction"), status.jurisdiction],
    [t("provider.onboarding.step.capability"), status.capability],
    [t("provider.onboarding.step.credentials"), status.credentials],
    [t("provider.onboarding.step.documents"), status.documents],
    [t("provider.onboarding.step.launchGate"), status.launchGate],
  ] as const;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("provider.onboarding.backAccessibility")} onPress={() => router.back()} style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
        <IconSymbol name="chevron.left" size={25} color={colors.foreground} />
      </Pressable>
      <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "800" }}>{t("provider.onboarding.title")}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{t("provider.onboarding.subtitle")}</Text>

      <View style={{ borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 9 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{t("provider.onboarding.activationStatus", { status: status.activation === "eligible" ? t("provider.onboarding.activationEligible") : t("provider.onboarding.activationBlocked") })}</Text>
        {steps.map(([label, value]) => <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{label}</Text>
          <Text style={{ color: statusColor(value, colors), fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{t(`provider.onboarding.status.${value}` as "provider.onboarding.status.complete")}</Text>
        </View>)}
      </View>

      <View style={{ borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{t("provider.onboarding.scope.title")}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{t("provider.onboarding.scope.help")}</Text>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 3 }}>{t("provider.onboarding.country")}</Text>
        <CountryChoiceList items={countryRegistryQuery.data ?? []} selectedCode={jurisdictionCode} onSelect={setJurisdictionCode} colors={colors} />
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 3 }}>{t("provider.onboarding.category")}</Text>
        <ChoiceList items={categories} selectedId={categoryId} onSelect={selectCategory} colors={colors} />
        {categoryId != null && <>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 5 }}>{t("provider.onboarding.subcategory")}</Text>
          {subcategories.length > 0 ? <>
            <ChoiceList items={subcategories} selectedId={subcategoryId} onSelect={selectSubcategory} colors={colors} />
            <Pressable accessibilityRole="button" onPress={() => { setSubcategoryId(null); setCapabilityId(null); }} style={({ pressed }) => ({ minHeight: 38, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: "#FF7A1A", fontSize: 12, fontWeight: "700" }}>{t("provider.onboarding.selectCategoryScope")}</Text>
            </Pressable>
          </> : <Text style={{ color: colors.muted, fontSize: 12 }}>{t("provider.onboarding.categoryScopeHelp")}</Text>}
        </>}
        {categoryId != null && <>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 5 }}>{t("provider.onboarding.capabilityScope")}</Text>
          <ChoiceList items={capabilities.map((item) => ({ id: item.id, name: item.displayName }))} selectedId={capabilityId} onSelect={setCapabilityId} colors={colors} emptyLabel={t("provider.onboarding.noCapability")} />
        </>}
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 8 }}>İşletme modeli</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {[["self_employed", "Serbest çalışan"], ["sole_trader", "Şahıs işletmesi"], ["company_owner", "Şirket sahibi"], ["company_worker", "Şirket çalışanı"], ["employee", "Çalışan"]].map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: operatingModel === value }} onPress={() => setOperatingModel(value as typeof operatingModel)} style={({ pressed }) => ({ minHeight: 38, justifyContent: "center", paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: operatingModel === value ? "#FF7A1A" : colors.border, backgroundColor: operatingModel === value ? "#FF7A1A18" : colors.background, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>{label}</Text></Pressable>)}
        </View>
        <Text style={{ color: operatingModelVerified ? colors.success : colors.muted, fontSize: 12 }}>{operatingModelVerified ? "İşletme modeli doğrulandı" : operatingModelQuery.data?.reviewStatus === "pending" ? "İşletme modeli incelemede" : "İşletme modeli henüz gönderilmedi"}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !jurisdictionCode || submitOperatingModelMutation.isPending }} onPress={submitOperatingModel} style={({ pressed }) => ({ minHeight: 42, justifyContent: "center", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.primary, opacity: pressed || !jurisdictionCode || submitOperatingModelMutation.isPending ? 0.55 : 1 })}>
          {submitOperatingModelMutation.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>İşletme modelini gönder</Text>}
        </Pressable>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 8 }}>Hizmet alanı</Text>
        <TextInput value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="Enlem (örn. 41.0082)" placeholderTextColor={colors.muted} accessibilityLabel="Hizmet alanı enlemi" style={{ minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 12 }} />
        <TextInput value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="Boylam (örn. 28.9784)" placeholderTextColor={colors.muted} accessibilityLabel="Hizmet alanı boylamı" style={{ minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 12 }} />
        <TextInput value={serviceRadiusKm} onChangeText={setServiceRadiusKm} keyboardType="number-pad" placeholder="Hizmet yarıçapı (1–500 km)" placeholderTextColor={colors.muted} accessibilityLabel="Hizmet yarıçapı kilometre" style={{ minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 12 }} />
        <Text style={{ color: hasValidServiceArea ? colors.success : colors.muted, fontSize: 12 }}>{hasValidServiceArea ? "Hizmet alanı kaydedilmeye hazır" : "Geçerli enlem, boylam ve 1–500 km yarıçap girin."}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !categoryId || !capabilityId || !jurisdictionCode || !operatingModelVerified || !hasValidServiceArea || configureMutation.isPending }} onPress={submit} style={({ pressed }) => ({ minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, marginTop: 6, backgroundColor: "#FF7A1A", opacity: pressed || !categoryId || !capabilityId || !jurisdictionCode || !operatingModelVerified || !hasValidServiceArea || configureMutation.isPending ? 0.55 : 1 })}>
          {configureMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>{t("provider.onboarding.saveScope")}</Text>}
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push("/provider-documents" as never)} style={({ pressed }) => ({ minHeight: 52, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: pressed ? 0.7 : 1 })}>
        <View><Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>{t("provider.onboarding.openDocuments")}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{t("provider.onboarding.openDocumentsHint")}</Text></View>
        <IconSymbol name="chevron.right" size={22} color={colors.muted} />
      </Pressable>
    </ScrollView>
  </ScreenContainer>;
}

function ChoiceList({ items, selectedId, onSelect, colors, emptyLabel }: { items: { id: number; name: string }[]; selectedId: number | null; onSelect: (id: number) => void; colors: ReturnType<typeof useColors>; emptyLabel?: string }) {
  const { t } = useTranslation();
  if (items.length === 0) return <Text style={{ color: colors.muted, fontSize: 12 }}>{emptyLabel ?? t("provider.onboarding.emptyOptions")}</Text>;
  return <View style={{ gap: 7 }}>{items.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: item.id === selectedId }} onPress={() => onSelect(item.id)} style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 12, borderRadius: 9, justifyContent: "center", backgroundColor: item.id === selectedId ? "#FF7A1A18" : colors.background, borderWidth: 1, borderColor: item.id === selectedId ? "#FF7A1A" : colors.border, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: item.id === selectedId ? "800" : "600" }}>{item.name}</Text></Pressable>)}</View>;
}

function CountryChoiceList({ items, selectedCode, onSelect, colors }: { items: { countryCode: string; displayName: string; selectable: boolean; availability: "AVAILABLE" | "COMING_SOON" | "BLOCKED" }[]; selectedCode: string | null; onSelect: (code: string) => void; colors: ReturnType<typeof useColors> }) {
  const { t } = useTranslation();
  if (items.length === 0) return <Text style={{ color: colors.error, fontSize: 12 }}>{t("provider.onboarding.countryUnavailable")}</Text>;
  return <View style={{ gap: 7 }}>{items.map((item) => {
    const selected = item.countryCode === selectedCode;
    const availabilityKey = item.availability === "AVAILABLE" ? "provider.onboarding.countryAvailable" : item.availability === "COMING_SOON" ? "provider.onboarding.countryComingSoon" : "provider.onboarding.countryBlocked";
    return <Pressable key={item.countryCode} accessibilityRole="radio" accessibilityState={{ selected, disabled: !item.selectable }} accessibilityLabel={`${item.displayName}: ${t(availabilityKey)}`} disabled={!item.selectable} onPress={() => onSelect(item.countryCode)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, borderRadius: 9, justifyContent: "center", backgroundColor: selected ? "#FF7A1A18" : colors.background, borderWidth: 1, borderColor: selected ? "#FF7A1A" : colors.border, opacity: !item.selectable ? 0.52 : pressed ? 0.7 : 1 })}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: selected ? "800" : "600" }}>{item.displayName}</Text><Text style={{ color: item.selectable ? colors.success : colors.muted, fontSize: 11, marginTop: 2 }}>{t(availabilityKey)}</Text></Pressable>;
  })}</View>;
}
