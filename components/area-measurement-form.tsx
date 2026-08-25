import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useTranslation } from "@/lib/i18n";
import { resolveAreaMeasurementCapability, type AreaMeasurementCapability } from "@/lib/area-measurement-capability";
import {
  AREA_MEASUREMENT_VERSION,
  calculateAreaMeasurement,
  type MeasurementPoint,
  type VersionedAreaMeasurementDraft,
} from "@/shared/area-measurement";

type MeasurementMethod = "manual_rectangle" | "manual_polygon";
type MeasurementUnit = "m" | "cm";

export type AreaMeasurementFormProps = {
  value: VersionedAreaMeasurementDraft | undefined;
  onChange: (value: VersionedAreaMeasurementDraft | undefined) => void;
};

function makeIdempotencyKey() {
  return `area_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function parsePolygon(value: string): MeasurementPoint[] {
  const tokens = value.split(";").map((item) => item.trim()).filter(Boolean);
  if (tokens.length < 3 || tokens.length > 100) throw new Error("MEASUREMENT_INVALID_POLYGON");
  return tokens.map((token) => {
    const [rawX, rawY, ...rest] = token.split(",").map((part) => part.trim());
    const x = Number(rawX);
    const y = Number(rawY);
    if (rest.length > 0 || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
      throw new Error("MEASUREMENT_INVALID_POINT");
    }
    return { x, y };
  });
}

export function AreaMeasurementForm({ value, onChange }: AreaMeasurementFormProps) {
  const colors = useColors();
  const { t, isRTL } = useTranslation();
  const [method, setMethod] = useState<MeasurementMethod>(value?.method === "manual_polygon" ? "manual_polygon" : "manual_rectangle");
  const [unit, setUnit] = useState<MeasurementUnit>(value?.unit === "cm" || value?.unit === "cm2" ? "cm" : "m");
  const [width, setWidth] = useState(value?.width == null ? "" : String(value.width));
  const [height, setHeight] = useState(value?.height == null ? "" : String(value.height));
  const [points, setPoints] = useState(() => value?.points?.map((point) => `${point.x},${point.y}`).join("; ") ?? "");
  const [idempotencyKey, setIdempotencyKey] = useState(value?.idempotencyKey ?? makeIdempotencyKey);
  const [capability, setCapability] = useState<AreaMeasurementCapability | null>(null);

  useEffect(() => {
    let active = true;
    void resolveAreaMeasurementCapability().then((result) => {
      if (active) setCapability(result);
    });
    return () => { active = false; };
  }, []);

  const evaluation = useMemo(() => {
    const hasInput = method === "manual_polygon" ? points.trim().length > 0 : width.trim().length > 0 || height.trim().length > 0;
    if (!hasInput) return { draft: undefined, area: null as number | null, error: null as string | null };
    try {
      const base = method === "manual_polygon"
        ? { method, unit, points: parsePolygon(points) }
        : { method, unit, width: Number(width), height: Number(height) };
      const result = calculateAreaMeasurement(base);
      const draft: VersionedAreaMeasurementDraft = {
        version: AREA_MEASUREMENT_VERSION,
        ...base,
        idempotencyKey,
        capabilityClass: "manual",
        qualityWarning: "estimated",
      };
      return { draft, area: result.squareMeters, error: null as string | null };
    } catch {
      return { draft: undefined, area: null as number | null, error: t("request.measurement.invalid") };
    }
  }, [height, idempotencyKey, method, points, t, unit, width]);

  useEffect(() => {
    onChange(evaluation.draft);
  }, [evaluation.draft, onChange]);

  const reset = () => {
    setWidth("");
    setHeight("");
    setPoints("");
    setIdempotencyKey(makeIdempotencyKey());
    onChange(undefined);
  };

  const switchMethod = (next: MeasurementMethod) => {
    setMethod(next);
    setIdempotencyKey(makeIdempotencyKey());
  };

  return (
    <View
      style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 }}
      accessibilityLabel={t("request.measurement.accessibility")}
    >
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14, textAlign: isRTL ? "right" : "left" }}>{t("request.measurement.title")}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>{t("request.measurement.notice")}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["manual_rectangle", "manual_polygon"] as const).map((option) => {
          const selected = method === option;
          return (
            <Pressable
              key={option}
              onPress={() => switchMethod(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option === "manual_rectangle" ? t("request.measurement.rectangle") : t("request.measurement.polygon")}
              style={({ pressed }) => ({ flex: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}18` : colors.background, opacity: pressed ? 0.78 : 1 })}
            >
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
                {option === "manual_rectangle" ? t("request.measurement.rectangle") : t("request.measurement.polygon")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["m", "cm"] as const).map((option) => {
          const selected = unit === option;
          return (
            <Pressable
              key={option}
              onPress={() => { setUnit(option); setIdempotencyKey(makeIdempotencyKey()); }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option === "m" ? t("request.measurement.meters") : t("request.measurement.centimeters")}
              style={({ pressed }) => ({ minWidth: 64, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}18` : colors.background, opacity: pressed ? 0.78 : 1 })}
            >
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "700", textAlign: "center" }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {method === "manual_rectangle" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 5 }}>{t("request.measurement.width")}</Text>
            <TextInput value={width} onChangeText={setWidth} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} style={{ color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 5 }}>{t("request.measurement.height")}</Text>
            <TextInput value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} style={{ color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
          </View>
        </View>
      ) : (
        <View>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 5 }}>{t("request.measurement.points")}</Text>
          <TextInput value={points} onChangeText={setPoints} multiline placeholder={t("request.measurement.pointsPlaceholder")} placeholderTextColor={colors.muted} style={{ color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64, textAlignVertical: "top" }} />
        </View>
      )}

      {evaluation.error ? <Text style={{ color: colors.error, fontSize: 12 }}>{evaluation.error}</Text> : null}
      {evaluation.area != null ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${colors.primary}12`, borderRadius: 10, padding: 10 }}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>{t("request.measurement.estimatedArea")}</Text>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>{evaluation.area.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {capability ? <Text style={{ flex: 1, color: colors.muted, fontSize: 12 }}>{t(`request.measurement.capability.${capability.status}` as `request.${string}`)}</Text> : <ActivityIndicator color={colors.primary} size="small" />}
        {(width || height || points) ? (
          <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel={t("request.measurement.remove")} style={({ pressed }) => ({ padding: 7, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: "700" }}>{t("request.measurement.remove")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
