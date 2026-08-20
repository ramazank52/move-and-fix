import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/provider-onboarding.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "app/provider-dashboard.tsx"), "utf8");

describe("P16 provider onboarding mobile contract", () => {
  it("loads canonical choices and lifecycle exclusively through authenticated provider tRPC endpoints", () => {
    expect(source).toContain("trpc.provider.getOnboardingStatus.useQuery");
    expect(source).toContain("trpc.provider.getOnboardingCatalog.useQuery");
    expect(source).toContain("trpc.provider.configureOnboarding.useMutation");
    expect(source).not.toContain("mockOnboarding");
    expect(source).not.toContain("demoCatalog");
  });

  it("resets dependent choices and blocks saves without jurisdiction, a verified operating model or a valid service area", () => {
    expect(source).toContain("setSubcategoryId(null)");
    expect(source).toContain("setCapabilityId(null)");
    expect(source).toContain("item.subcategoryId === subcategoryId");
    expect(source).toContain("trpc.countryRegistry.list.useQuery");
    expect(source).toContain("trpc.provider.submitOperatingModel.useMutation");
    expect(source).toContain("trpc.provider.getOperatingModel.useQuery");
    expect(source).toContain("const hasValidServiceArea");
    expect(source).toContain("const operatingModelVerified");
    expect(source).toContain("if (!categoryId || !capabilityId || !jurisdictionCode || !hasValidServiceArea || !operatingModelVerified || configureMutation.isPending) return;");
    expect(source).toContain("accessibilityState={{ disabled: !categoryId || !capabilityId || !jurisdictionCode || !operatingModelVerified || !hasValidServiceArea || configureMutation.isPending }}");
    expect(source).toContain("disabled={!item.selectable}");
    expect(source).toContain("jurisdictionCode");
  });

  it("keeps document review and blocked activation visible from the server lifecycle state", () => {
    expect(source).toContain('router.push("/provider-documents" as never)');
    expect(source).toContain("status.activation === \"eligible\"");
    expect(source).toContain('t("provider.onboarding.step.launchGate")');
    expect(dashboardSource).toContain('router.push("/provider-onboarding" as never)');
    expect(dashboardSource).toContain('onboardingQuery.data?.activation !== "eligible"');
  });
});
