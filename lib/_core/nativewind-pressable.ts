// NativeWind + Pressable: className can swallow onPress. Disable className mapping globally.
import { Pressable } from "react-native";
import { remapProps } from "nativewind";

remapProps(Pressable, { className: false });

/**
 * Existing screens contain many text-bearing Pressable controls.  Mark them
 * accessible by default while allowing explicit `accessibilityRole`, label and
 * state props on icon-only or special controls to take precedence.
 */
const pressableWithDefaults = Pressable as typeof Pressable & {
  defaultProps?: Record<string, unknown>;
};

pressableWithDefaults.defaultProps = {
  ...pressableWithDefaults.defaultProps,
  accessible: true,
  accessibilityRole: "button",
};
