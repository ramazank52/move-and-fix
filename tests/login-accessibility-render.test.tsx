import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn() };
const mutation = { isPending: false, mutate: vi.fn() };

function hostComponent(name: string) {
  return ({ children, ...props }: Record<string, unknown>) => React.createElement(name, props, children as React.ReactNode);
}

vi.mock("react-native", () => ({
  ActivityIndicator: hostComponent("activity-indicator"),
  Platform: { OS: "web" },
  Pressable: hostComponent("pressable"),
  Text: hostComponent("text"),
  TextInput: hostComponent("text-input"),
  View: hostComponent("view"),
}));
vi.mock("expo-router", () => ({ useRouter: () => router }));
vi.mock("@/components/screen-container", () => ({ ScreenContainer: hostComponent("screen-container") }));
vi.mock("@/components/ui/icon-symbol", () => ({ IconSymbol: hostComponent("icon") }));
vi.mock("@/constants/oauth", () => ({ startOAuthLogin: vi.fn() }));
vi.mock("@/lib/_core/auth", () => ({ setSessionToken: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/use-colors", () => ({
  useColors: () => ({ primary: "#4F46E5", muted: "#64748B", card: "#FFFFFF", foreground: "#111827", border: "#E2E8F0", error: "#DC2626" }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: { auth: { login: { useMutation: () => mutation } } },
}));

import LoginScreen from "../app/login";

describe("login screen accessibility render contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutation.isPending = false;
  });

  it("renders named credential fields and named, stateful critical actions", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const fields = renderer!.root.findAll((node) => String(node.type) === "text-input");
    expect(fields.map((field) => field.props.accessibilityLabel)).toEqual(["E-posta adresi", "Parola"]);
    expect(fields.map((field) => field.props.accessibilityHint)).toEqual([
      "Hesabınızda kayıtlı e-posta adresini girin",
      "Hesap parolanızı girin",
    ]);

    const actions = renderer!.root.findAll((node) => String(node.type) === "pressable");
    const localLogin = actions.find((node) => node.props.accessibilityLabel === "E-posta ve parola ile giriş yap");
    const oauthLogin = actions.find((node) => node.props.accessibilityLabel === "Güvenli giriş yap");
    const forgotPassword = actions.find((node) => node.props.accessibilityLabel === "Parolamı unuttum");
    const register = actions.find((node) => node.props.accessibilityLabel === "Kayıt ekranına git");

    expect(localLogin?.props.accessibilityRole).toBe("button");
    expect(localLogin?.props.accessibilityState).toMatchObject({ disabled: true, busy: false });
    expect(oauthLogin?.props.accessibilityRole).toBe("button");
    expect(forgotPassword?.props.accessibilityRole).toBe("button");
    expect(register?.props.accessibilityRole).toBe("button");
  });
});
