import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";

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

    // Redirect based on auth state
    if (user) {
      // User is authenticated — go to customer home (tabs)
      router.replace("/(tabs)" as any);
    } else {
      // User is not authenticated — go to onboarding
      router.replace("/onboarding" as any);
    }
  }, [user, loading, router]);

  // Show loading screen while checking auth
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
