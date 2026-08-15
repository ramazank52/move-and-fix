import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { resolveEntryRoute } from "@/lib/navigation";

/**
 * Root index route — handles authentication redirects
 * - Authenticated user → (tabs) customer home
 * - Unauthenticated → onboarding
 */
export default function RootIndexScreen() {
  const colors = useColors();
  const { user, loading } = useAuth();

  // `Redirect` is rendered immediately after bootstrap instead of waiting for an
  // effect. This prevents a stale browser cookie from leaving the root route on
  // an intermediate loading frame after the auth request resolves to `null`.
  if (!loading) {
    return <Redirect href={resolveEntryRoute(user) as any} />;
  }

  // Show loading only while the auth request itself is pending.
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
