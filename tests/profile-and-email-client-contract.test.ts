import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("profile and email client contracts", () => {
  it("binds profile editing to the authenticated user and real tRPC mutation state", () => {
    const source = readProjectFile("app/settings/profile-edit.tsx");
    expect(source).toContain("useAuth()");
    expect(source).toContain("trpc.auth.updateProfile.useMutation");
    expect(source).toContain("updateProfile.isPending");
    expect(source).not.toContain("kullanici@email.com");
  });

  it("routes the legacy nested email URL to the real session-backed verification flow", () => {
    const nestedRoute = readProjectFile("app/verify/email.tsx");
    const realScreen = readProjectFile("app/verify-email.tsx");
    expect(nestedRoute).toContain('export { default } from "../verify-email"');
    expect(realScreen).toContain("useAuth()");
    expect(realScreen).toContain("user?.email");
    expect(realScreen).toContain("trpc.auth.verifyCode.useMutation");
    expect(realScreen).not.toContain("kullanici@email.com");
  });
});
