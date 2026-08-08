import { useEffect } from "react";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    router.replace(resolveEntryRoute(user) as any);
  }, [user, loading, router]);

  // Show loading screen while checking auth
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
