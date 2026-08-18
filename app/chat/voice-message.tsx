import { Redirect } from "expo-router";

/** Voice messages are rendered within an authorized conversation only. */
export default function LegacyVoiceMessageRoute() {
  return <Redirect href="/" />;
}
