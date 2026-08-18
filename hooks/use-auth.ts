import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

function mapApiUser(apiUser: NonNullable<Awaited<ReturnType<typeof Api.getMe>>>): Auth.User {
  return {
    id: apiUser.id,
    openId: apiUser.openId,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone,
    loginMethod: apiUser.loginMethod,
    role: apiUser.role,
    accountType: apiUser.accountType,
    lastSignedIn: new Date(apiUser.lastSignedIn),
  };
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionToken = await Auth.getSessionToken();
      const cachedUser = await Auth.getUserInfo();

      // Web uses its HTTP-only cookie; native requires a locally stored Bearer token.
      if (Platform.OS !== "web" && !sessionToken) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }

      const apiUser = await Api.getMe();
      if (apiUser) {
        const userInfo = mapApiUser(apiUser);
        setUser(userInfo);
        await Auth.setUserInfo(userInfo);
        return;
      }

      // A normal cached account may keep the shell usable offline. Admin access is
      // never restored from cache because its privilege must be server-confirmed.
      if (Platform.OS !== "web" && cachedUser && cachedUser.accountType !== "admin") {
        setUser(cachedUser);
      } else {
        setUser(null);
        await Auth.clearUserInfo();
      }
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Oturum doğrulanamadı");
      setError(authError);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
