import { beforeEach, describe, expect, it, vi } from "vitest";

const webStorage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
});

const authKeys = vi.hoisted(() => ({
  SESSION_TOKEN_KEY: "app_session_token",
  USER_INFO_KEY: "manus-runtime-user-info",
}));

vi.stubGlobal("window", { localStorage: webStorage });
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("@/constants/oauth", () => authKeys);

import { getSessionToken, getUserInfo, setUserInfo, type User } from "../lib/_core/auth";

const staleUser: User = {
  id: 42,
  openId: "stale-web-user",
  name: "Stale User",
  email: "stale@example.com",
  phone: "+905555555555",
  loginMethod: "oauth",
  role: "admin",
  accountType: "admin",
  lastSignedIn: new Date("2026-08-08T10:00:00.000Z"),
};

describe("web auth storage", () => {
  beforeEach(() => {
    webStorage.values.clear();
    vi.clearAllMocks();
  });

  it("never restores an identity or session from a legacy localStorage snapshot", async () => {
    webStorage.values.set(authKeys.USER_INFO_KEY, JSON.stringify(staleUser));

    expect(await getSessionToken()).toBeNull();
    expect(await getUserInfo()).toBeNull();

    await setUserInfo(staleUser);

    expect(webStorage.getItem(authKeys.USER_INFO_KEY)).toBeNull();
    expect(webStorage.removeItem).toHaveBeenCalledWith(authKeys.USER_INFO_KEY);
  });
});
