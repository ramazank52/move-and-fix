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
  "wrench.and.screwdriver.fill": "handyman",
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
  "checkmark.shield.fill": "verified-user",
  "line.horizontal.3.decrease.circle.fill": "filter-list",
  "location.circle.fill": "location-on",
  "heart": "favorite-border",
  "star": "star-border",
  "phone": "phone",
  "phone.circle.fill": "phone",
  "arrow.left": "arrow-back",
  "arrow.right.circle.fill": "arrow-forward",
  "checkmark.circle.fill": "check-circle",
  "checkmark.seal.fill": "verified",
  "hand.thumbsup.fill": "thumb-up",
  "gift.fill": "card-giftcard",
  "headphones": "headset",
  "lock.fill": "lock",
  "bolt.heart.fill": "flash-on",
  "mappin.and.ellipse": "location-on",
  "chevron.down": "keyboard-arrow-down",
  "chevron.up": "keyboard-arrow-up",
  "plus": "add",
  "minus": "remove",
  "square.and.arrow.up": "share",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "clock": "schedule",
  "tag.fill": "local-offer",
  "creditcard": "credit-card",
  "wallet.pass.fill": "account-balance-wallet",
  "person.crop.circle.badge.checkmark": "verified-user",
  "building.2.fill": "business",
  "car.fill": "directions-car",
  "wrench.adjustable.fill": "build",
  "house": "home",
  "magnifyingglass.circle.fill": "search",
  "text.bubble.fill": "chat-bubble",
  "sun.max.fill": "wb-sunny",
  "moon.fill": "nightlight",
  "globe": "public",
  "bell.badge.fill": "notifications",
  "chevron.left": "chevron-left",
  "wifi.exclamationmark": "wifi-off",
  "lock.shield.fill": "security",
  "square.and.pencil": "edit-note",
  "info": "info-outline",
  "shippingbox.fill": "inventory-2",
  "arrow.up.right": "north-east",
  "arrow.down.right": "south-west",
  "refresh": "refresh",
  "wifi": "wifi",
  "exclamationmark.circle.fill": "error",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "key.fill": "key",
  "person.badge.shield.checkmark.fill": "verified-user",
  "scroll.fill": "description",
  "flag.fill": "flag",
  "trash": "delete",
  "externaldrive.fill": "storage",
  "internaldrive.fill": "storage",
  "network": "lan",
  "server.rack": "dns",
  "terminal.fill": "terminal",
  "doc.fill": "description",
  "folder.fill": "folder",
  "envelope.fill": "email",
  "link": "link",
  "copy": "content-copy",
  "paintpalette.fill": "format-paint",
  "leaf.fill": "eco",
  "flame.fill": "local-fire-department",
  "sofa.fill": "weekend",
  "thermometer.medium": "thermostat",
  "refrigerator.fill": "kitchen",
  "circle": "radio-button-unchecked",
  "play.circle.fill": "play-circle-filled",
} as unknown as IconMapping;

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
