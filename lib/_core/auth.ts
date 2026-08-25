import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  accountType: "customer" | "provider" | "admin";
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      return null;
    }

    // Use SecureStore for native
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      return;
    }

    // Use SecureStore for native
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (error) {
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    // Web platform uses cookie-based auth, logout is handled by server clearing cookie
    if (Platform.OS === "web") {
      return;
    }

    // Use SecureStore for native
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    if (Platform.OS === "web") {
      // Web authentication is cookie-backed. Never resurrect an identity from
      // localStorage after session expiry, revoke, logout or account switching.
      return null;
    }

    // Native uses SecureStore only after a token-bound session check.
    const info = await SecureStore.getItemAsync(USER_INFO_KEY);

    if (!info) {
      return null;
    }
    const stored = JSON.parse(info) as Partial<User> & Pick<User, "id" | "openId">;
    const role = stored.role === "admin" ? "admin" : "user";
    const accountType =
      stored.accountType === "provider" || stored.accountType === "admin"
        ? stored.accountType
        : role === "admin"
          ? "admin"
          : "customer";
    const user: User = {
      id: stored.id,
      openId: stored.openId,
      name: stored.name ?? null,
      email: stored.email ?? null,
      phone: stored.phone ?? null,
      loginMethod: stored.loginMethod ?? null,
      role,
      accountType,
      lastSignedIn: new Date(stored.lastSignedIn ?? Date.now()),
    };
    return user;
  } catch {
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Do not persist user, role, phone or email snapshots in web storage.
      // Remove any legacy cache so it cannot survive account changes.
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }

    // Use SecureStore for native
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
  } catch {
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Use localStorage for web
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }

    // Use SecureStore for native
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch {
  }
}
