import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import React from "react";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ThemeColorPalette } from "@/constants/theme";

type HomeColors = Pick<
  ThemeColorPalette,
  "accentBlue" | "accentPurple" | "border" | "error" | "foreground" | "muted" | "primary" | "surface" | "warning"
>;
type IconName = Parameters<typeof IconSymbol>[0]["name"];

export type HomeQuickAccessItem = {
  name: string;
  icon: IconName;
  color: string;
};

export type HomePopularServiceItem = {
  name: string;
  count: number;
  icon: IconName;
};

export type HomeNearbyProvider = {
  id: number | string;
  displayName: string;
  isVerified?: boolean | number | null;
  rating?: number | null;
};

export type HomeScreenViewProps = {
  colors: HomeColors;
  greeting: string;
  subtitle: string;
  searchPlaceholder: string;
  moveAITitle: string;
  moveAISubtitle: string;
  quickAccessTitle: string;
  nearbyProvidersTitle: string;
  popularServicesTitle: string;
  seeAllLabel: string;
  noNearbyProvidersLabel: string;
  activeJobLabel: string;
  serviceCount: (count: number) => string;
  quickAccess: readonly HomeQuickAccessItem[];
  popularServices: readonly HomePopularServiceItem[];
  activeJob?: { id: number | string };
  nearbyProviders?: readonly HomeNearbyProvider[];
  providersLoading: boolean;
  interactionsDisabled: boolean;
  onOpenMoveAI: () => void;
  onOpenExplore: () => void;
  onOpenJob: (id: number | string) => void;
  onOpenProvider: (id: number | string) => void;
};

/**
 * The sole Home visual tree. Production supplies live data and callbacks;
 * development fixtures may supply immutable in-memory props only.
 */
export function HomeScreenView({
  colors,
  greeting,
  subtitle,
  searchPlaceholder,
  moveAITitle,
  moveAISubtitle,
  quickAccessTitle,
  nearbyProvidersTitle,
  popularServicesTitle,
  seeAllLabel,
  noNearbyProvidersLabel,
  activeJobLabel,
  serviceCount,
  quickAccess,
  popularServices,
  activeJob,
  nearbyProviders,
  providersLoading,
  interactionsDisabled,
  onOpenMoveAI,
  onOpenExplore,
  onOpenJob,
  onOpenProvider,
}: HomeScreenViewProps) {
  const [focusedControl, setFocusedControl] = React.useState<string | null>(null);
  const accessibilityState = { disabled: interactionsDisabled };
  const runIfEnabled = (callback: () => void) => () => {
    if (!interactionsDisabled) callback();
  };
  const runWithIdIfEnabled = (callback: (id: number | string) => void, id: number | string) => () => {
    if (!interactionsDisabled) callback(id);
  };
  const interactionStateStyle = (pressed: boolean, controlId: string, pressedOpacity: number) => {
    if (focusedControl === controlId) return { borderWidth: 2, borderColor: colors.primary, opacity: interactionsDisabled ? 1 : pressed ? pressedOpacity : 1 };
    if (interactionsDisabled) return { borderWidth: 1.5, borderColor: colors.muted, opacity: 1 };
    return { opacity: pressed ? pressedOpacity : 1 };
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>{greeting}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>
        </View>

        {interactionsDisabled ? <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: colors.surface, borderColor: colors.muted, borderWidth: 1 }}><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>Eylemler devre dışı</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Bu fixture durumunda arama ve tüm yönlendirme kontrolleri çalışmaz.</Text></View> : null}

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 }}>
            <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
            <TextInput accessibilityLabel={searchPlaceholder} accessibilityState={accessibilityState} placeholder={searchPlaceholder} placeholderTextColor={colors.muted} editable={!interactionsDisabled} style={{ flex: 1, marginLeft: 10, color: interactionsDisabled ? colors.muted : colors.foreground, fontSize: 14 }} />
            <IconSymbol size={14} name="location.fill" color={colors.muted} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={moveAITitle} accessibilityHint={moveAISubtitle} disabled={interactionsDisabled} onFocus={() => setFocusedControl("move-ai")} onBlur={() => setFocusedControl(null)} onPress={runIfEnabled(onOpenMoveAI)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 16, backgroundColor: interactionsDisabled ? colors.surface : colors.accentPurple }, interactionStateStyle(pressed, "move-ai", 0.9)]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: interactionsDisabled ? colors.border : "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}><IconSymbol name="sparkles" size={24} color={interactionsDisabled ? colors.muted : "#FFFFFF"} /></View>
              <View style={{ marginLeft: 12, flex: 1 }}><Text style={{ fontSize: 14, fontWeight: "700", color: interactionsDisabled ? colors.foreground : "#FFFFFF" }}>{moveAITitle}</Text><Text style={{ fontSize: 12, color: interactionsDisabled ? colors.muted : "rgba(255,255,255,0.85)", marginTop: 3 }}>{moveAISubtitle}</Text></View>
            </View>
            <IconSymbol size={20} name="chevron.right" color={interactionsDisabled ? colors.muted : "#FFFFFF"} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>{quickAccessTitle}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickAccess.map((cat, idx) => <Pressable key={idx} accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={cat.name} disabled={interactionsDisabled} onFocus={() => setFocusedControl(`quick-${idx}`)} onBlur={() => setFocusedControl(null)} onPress={runIfEnabled(onOpenExplore)} style={({ pressed }) => [{ flex: 1, borderRadius: 14, padding: 12, alignItems: "center", backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border }, interactionStateStyle(pressed, `quick-${idx}`, 0.85)]}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: interactionsDisabled ? colors.border : cat.color + "15", alignItems: "center", justifyContent: "center", marginBottom: 6 }}><IconSymbol size={20} name={cat.icon} color={interactionsDisabled ? colors.muted : cat.color} /></View><Text style={{ fontSize: 11, fontWeight: "600", color: interactionsDisabled ? colors.muted : colors.foreground, textAlign: "center" }}>{cat.name}</Text></Pressable>)}
          </View>
        </View>

        {activeJob && <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={activeJobLabel} disabled={interactionsDisabled} onFocus={() => setFocusedControl("active-job")} onBlur={() => setFocusedControl(null)} onPress={runWithIdIfEnabled(onOpenJob, activeJob.id)} style={({ pressed }) => [{ borderRadius: 16, padding: 16, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border }, interactionStateStyle(pressed, "active-job", 0.9)]}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: colors.muted }}>{activeJobLabel}</Text><Text style={{ fontSize: 15, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.foreground, marginTop: 4 }}>Hizmet Talebi #{activeJob.id}</Text></View><View style={{ backgroundColor: interactionsDisabled ? colors.border : colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}><Text style={{ fontSize: 11, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.primary }}>Yolda</Text></View></View><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: interactionsDisabled ? colors.border : colors.primary + "15", alignItems: "center", justifyContent: "center" }}><IconSymbol size={16} name="person.fill" color={interactionsDisabled ? colors.muted : colors.primary} /></View><View><Text style={{ fontSize: 11, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.foreground }}>Profesyonel</Text><Text style={{ fontSize: 11, color: colors.muted }}>5 km uzakta</Text></View></View><Text style={{ fontSize: 11, color: colors.muted }}>ETA: 10 dk</Text></View></Pressable></View>}

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{nearbyProvidersTitle}</Text><Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={`${nearbyProvidersTitle} ${seeAllLabel}`} disabled={interactionsDisabled} onFocus={() => setFocusedControl("nearby-see-all")} onBlur={() => setFocusedControl(null)} onPress={runIfEnabled(onOpenExplore)} style={({ pressed }) => interactionStateStyle(pressed, "nearby-see-all", 0.75)}><Text style={{ fontSize: 12, color: interactionsDisabled ? colors.muted : colors.primary, fontWeight: "700" }}>{seeAllLabel}</Text></Pressable></View>
          {providersLoading ? <View style={{ alignItems: "center", paddingVertical: 20 }}><ActivityIndicator color={colors.primary} size="small" /></View> : nearbyProviders && nearbyProviders.length > 0 ? <View style={{ gap: 10 }}>{nearbyProviders.slice(0, 3).map((provider) => <Pressable key={provider.id} accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={provider.displayName} disabled={interactionsDisabled} onFocus={() => setFocusedControl(`provider-${provider.id}`)} onBlur={() => setFocusedControl(null)} onPress={runWithIdIfEnabled(onOpenProvider, provider.id)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 12, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border }, interactionStateStyle(pressed, `provider-${provider.id}`, 0.9)]}><View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: interactionsDisabled ? colors.border : colors.primary + "15", alignItems: "center", justifyContent: "center" }}><IconSymbol size={20} name="person.fill" color={interactionsDisabled ? colors.muted : colors.primary} /></View><View style={{ marginLeft: 12, flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Text style={{ fontSize: 13, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.foreground }}>{provider.displayName}</Text>{provider.isVerified ? <IconSymbol size={12} name="checkmark.seal.fill" color={interactionsDisabled ? colors.muted : colors.accentBlue} /> : null}</View><View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><IconSymbol size={10} name="star.fill" color={interactionsDisabled ? colors.muted : colors.warning} /><Text style={{ fontSize: 11, color: colors.muted }}>{provider.rating || 0}</Text></View><Text style={{ fontSize: 11, color: colors.muted }}>• Yakında</Text></View></View></View><View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 12, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.primary }}>₺6.500</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Başlangıç</Text></View></Pressable>)}</View> : <View style={{ alignItems: "center", paddingVertical: 20 }}><Text style={{ fontSize: 14, color: colors.muted }}>{noNearbyProvidersLabel}</Text></View>}
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{popularServicesTitle}</Text><Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={`${popularServicesTitle} ${seeAllLabel}`} disabled={interactionsDisabled} onFocus={() => setFocusedControl("popular-see-all")} onBlur={() => setFocusedControl(null)} onPress={runIfEnabled(onOpenExplore)} style={({ pressed }) => interactionStateStyle(pressed, "popular-see-all", 0.75)}><Text style={{ fontSize: 12, color: interactionsDisabled ? colors.muted : colors.primary, fontWeight: "700" }}>{seeAllLabel}</Text></Pressable></View>
          <View style={{ gap: 8 }}>{popularServices.map((service, idx) => <Pressable key={idx} accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={service.name} disabled={interactionsDisabled} onFocus={() => setFocusedControl(`service-${idx}`)} onBlur={() => setFocusedControl(null)} onPress={runIfEnabled(onOpenExplore)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border }, interactionStateStyle(pressed, `service-${idx}`, 0.9)]}><View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: interactionsDisabled ? colors.border : colors.primary + "15", alignItems: "center", justifyContent: "center", marginRight: 10 }}><IconSymbol size={18} name={service.icon} color={interactionsDisabled ? colors.muted : colors.primary} /></View><View><Text style={{ fontSize: 13, fontWeight: "700", color: interactionsDisabled ? colors.muted : colors.foreground }}>{service.name}</Text><Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{serviceCount(service.count)}</Text></View></View><IconSymbol size={18} name="chevron.right" color={colors.muted} /></Pressable>)}</View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
