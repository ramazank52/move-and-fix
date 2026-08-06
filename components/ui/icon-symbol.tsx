// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "magnifyingglass": "search",
  "briefcase.fill": "work",
  "message.fill": "chat",
  "person.fill": "person",
  "map.fill": "map",
  "star.fill": "star",
  "bell.fill": "notifications",
  "gearshape.fill": "settings",
  "plus.circle.fill": "add-circle",
  "heart.fill": "favorite",
  "calendar": "event",
  "creditcard.fill": "credit-card",
  "shield.fill": "verified-user",
  "bolt.fill": "flash-on",
  "wrench.fill": "build",
  "location.fill": "location-on",
  "phone.fill": "phone",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "arrow.right": "arrow-forward",
  "xmark": "close",
  "checkmark": "check",
  "ellipsis": "more-horiz",
  "trash.fill": "delete",
  "pencil": "edit",
  "clock.fill": "schedule",
  "dollarsign.circle.fill": "payments",
  "chart.bar.fill": "bar-chart",
  "questionmark.circle.fill": "help",
  "sparkles": "auto-awesome",
  "doc.text.fill": "description",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
