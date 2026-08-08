import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

const authKeys = vi.hoisted(() => ({
  SESSION_TOKEN_KEY: "app_session_token",
  USER_INFO_KEY: "manus-runtime-user-info",
}));

vi.mock("expo-secure-store", () => secureStore);
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@/constants/oauth", () => authKeys);

import {
  clearUserInfo,
  getSessionToken,
  getUserInfo,
  removeSessionToken,
  setSessionToken,
  setUserInfo,
  type User,
} from "../lib/_core/auth";

const testUser: User = {
  id: 42,
  openId: "native-user",
  name: "Native User",
  email: "native@example.com",
  loginMethod: "oauth",
  role: "user",
  accountType: "customer",
  lastSignedIn: new Date("2026-08-08T10:00:00.000Z"),
};

describe("native auth storage logout", () => {
  beforeEach(() => {
    secureStore.values.clear();
    vi.clearAllMocks();
  });

  it("removes both the Bearer session token and cached user data", async () => {
    await setSessionToken("session-token-value");
    await setUserInfo(testUser);

    expect(await getSessionToken()).toBe("session-token-value");
    expect((await getUserInfo())?.id).toBe(testUser.id);

    await removeSessionToken();
    await clearUserInfo();

    expect(await getSessionToken()).toBeNull();
    expect(await getUserInfo()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(authKeys.SESSION_TOKEN_KEY);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(authKeys.USER_INFO_KEY);
  });

  it("does not restore an old token after repeated removal", async () => {
    await setSessionToken("old-token");
    await removeSessionToken();
    await removeSessionToken();

    expect(await getSessionToken()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
