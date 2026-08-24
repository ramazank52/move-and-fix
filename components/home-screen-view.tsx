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

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 }}>
            <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
            <TextInput placeholder={searchPlaceholder} placeholderTextColor={colors.muted} editable={!interactionsDisabled} style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 14 }} />
            <IconSymbol size={14} name="location.fill" color={colors.muted} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={moveAITitle} accessibilityHint={moveAISubtitle} disabled={interactionsDisabled} onPress={onOpenMoveAI} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 16, backgroundColor: colors.accentPurple, opacity: pressed ? 0.9 : 1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}><IconSymbol name="sparkles" size={24} color="#FFFFFF" /></View>
              <View style={{ marginLeft: 12, flex: 1 }}><Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>{moveAITitle}</Text><Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>{moveAISubtitle}</Text></View>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>{quickAccessTitle}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickAccess.map((cat, idx) => <Pressable key={idx} accessibilityRole="button" accessibilityLabel={cat.name} disabled={interactionsDisabled} onPress={onOpenExplore} style={({ pressed }) => [{ flex: 1, borderRadius: 14, padding: 12, alignItems: "center", backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cat.color + "15", alignItems: "center", justifyContent: "center", marginBottom: 6 }}><IconSymbol size={20} name={cat.icon} color={cat.color} /></View><Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>{cat.name}</Text></Pressable>)}
          </View>
        </View>

        {activeJob && <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Pressable accessibilityRole="button" accessibilityLabel={activeJobLabel} disabled={interactionsDisabled} onPress={() => onOpenJob(activeJob.id)} style={({ pressed }) => [{ borderRadius: 16, padding: 16, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: colors.muted }}>{activeJobLabel}</Text><Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginTop: 4 }}>Hizmet Talebi #{activeJob.id}</Text></View><View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}><Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Yolda</Text></View></View><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}><IconSymbol size={16} name="person.fill" color={colors.primary} /></View><View><Text style={{ fontSize: 11, fontWeight: "700", color: colors.foreground }}>Profesyonel</Text><Text style={{ fontSize: 11, color: colors.muted }}>5 km uzakta</Text></View></View><Text style={{ fontSize: 11, color: colors.muted }}>ETA: 10 dk</Text></View></Pressable></View>}

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{nearbyProvidersTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${nearbyProvidersTitle} ${seeAllLabel}`} disabled={interactionsDisabled} onPress={onOpenExplore}><Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>{seeAllLabel}</Text></Pressable></View>
          {providersLoading ? <View style={{ alignItems: "center", paddingVertical: 20 }}><ActivityIndicator color={colors.primary} size="small" /></View> : nearbyProviders && nearbyProviders.length > 0 ? <View style={{ gap: 10 }}>{nearbyProviders.slice(0, 3).map((provider) => <Pressable key={provider.id} accessibilityRole="button" accessibilityLabel={provider.displayName} disabled={interactionsDisabled} onPress={() => onOpenProvider(provider.id)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 12, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}><View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}><IconSymbol size={20} name="person.fill" color={colors.primary} /></View><View style={{ marginLeft: 12, flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{provider.displayName}</Text>{provider.isVerified ? <IconSymbol size={12} name="checkmark.seal.fill" color={colors.accentBlue} /> : null}</View><View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><IconSymbol size={10} name="star.fill" color={colors.warning} /><Text style={{ fontSize: 11, color: colors.muted }}>{provider.rating || 0}</Text></View><Text style={{ fontSize: 11, color: colors.muted }}>• Yakında</Text></View></View></View><View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>₺6.500</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Başlangıç</Text></View></Pressable>)}</View> : <View style={{ alignItems: "center", paddingVertical: 20 }}><Text style={{ fontSize: 14, color: colors.muted }}>{noNearbyProvidersLabel}</Text></View>}
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{popularServicesTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${popularServicesTitle} ${seeAllLabel}`} disabled={interactionsDisabled} onPress={onOpenExplore}><Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>{seeAllLabel}</Text></Pressable></View>
          <View style={{ gap: 8 }}>{popularServices.map((service, idx) => <Pressable key={idx} accessibilityRole="button" accessibilityLabel={service.name} disabled={interactionsDisabled} onPress={onOpenExplore} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}><View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center", marginRight: 10 }}><IconSymbol size={18} name={service.icon} color={colors.primary} /></View><View><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{service.name}</Text><Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{serviceCount(service.count)}</Text></View></View><IconSymbol size={18} name="chevron.right" color={colors.muted} /></Pressable>)}</View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
