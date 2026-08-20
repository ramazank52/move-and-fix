import { describe, expect, it } from "vitest";

import { evaluateAudit } from "../scripts/sca-gate.mjs";

function auditFixture({ packageName, version, severity = "high", patchedVersion = "2.0.0", path = "node_modules/example" }) {
  return {
    vulnerabilities: {
      [packageName]: {
        version,
        severity,
        nodes: [path],
        via: [{
          source: "GHSA-test-0000-0000",
          name: packageName,
          severity,
          range: "<=1.0.0",
          fixAvailable: patchedVersion === "NO_PATCH_DECLARED" ? false : { version: patchedVersion },
          url: "https://github.com/advisories/GHSA-test-0000-0000",
        }],
      },
    },
  };
}

describe("P17 deterministic SCA gate", () => {
  it("patchable high runtime advisory için raw audit exit code’dan bağımsız fail eder", () => {
    const report = evaluateAudit(auditFixture({ packageName: "qs", version: "6.14.2" }), { exceptions: [] });
    expect(report.gate).toBe("FAIL");
    expect(report.counts.blocking).toBe(1);
    expect(report.advisories[0].disposition).toBe("BLOCKED_PATCHABLE_RUNTIME");
  });

  it("moderate Expo toolchain advisory’sini görünür inceleme kaydı olarak tutar ancak high/critical gate’ini geçirmez", () => {
    const report = evaluateAudit(auditFixture({
      packageName: "uuid",
      version: "8.3.2",
      severity: "moderate",
      path: "node_modules/.pnpm/expo@55.0.29/node_modules/uuid",
    }), { exceptions: [] });
    expect(report.gate).toBe("PASS");
    expect(report.counts.blocking).toBe(0);
    expect(report.advisories[0].disposition).toBe("UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED");
  });

  it("yalnız kimlik, sürüm ve dependency path’i tam eşleşen explicit toolchain istisnasını kabul eder", () => {
    const audit = auditFixture({
      packageName: "image-size",
      path: "node_modules/.pnpm/metro@0.83.7/node_modules/image-size",
      patchedVersion: "NO_PATCH_DECLARED",
    });
    const report = evaluateAudit(audit, {
      exceptions: [{
        advisoryId: "GHSA-TEST-0000-0000",
        package: "image-size",
        installedVersion: "1.2.1",
        dependencyPath: "metro@0.83.7",
        reviewExpires: "2026-09-19",
        mitigation: "Trusted repository asset restriction",
      }],
    });
    expect(report.gate).toBe("PASS");
    expect(report.advisories[0].disposition).toBe("APPROVED_TOOLCHAIN_EXCEPTION");
  });

  it("aynı advisory için sürüm veya path eşleşmezse istisnayı kabul etmez", () => {
    const audit = auditFixture({ packageName: "image-size", path: "node_modules/.pnpm/metro@0.83.8/node_modules/image-size", patchedVersion: "NO_PATCH_DECLARED" });
    const report = evaluateAudit(audit, {
      exceptions: [{
        advisoryId: "GHSA-TEST-0000-0000",
        package: "image-size",
        installedVersion: "1.2.1",
        dependencyPath: "metro@0.83.7",
        reviewExpires: "2026-09-19",
        mitigation: "Trusted repository asset restriction",
      }],
    });
    expect(report.advisories[0].exception).toBeNull();
    expect(report.advisories[0].disposition).toBe("UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED");
    expect(report.gate).toBe("FAIL");
  });

  it("pnpm v1 advisory şemasını installed version ve patchability ile deterministic ayrıştırır", () => {
    const report = evaluateAudit({
      advisories: {
        123: {
          github_advisory_id: "GHSA-test-0000-0000",
          module_name: "qs",
          severity: "high",
          vulnerable_versions: "<=6.15.1",
          patched_versions: ">=6.15.2",
          url: "https://github.com/advisories/GHSA-test-0000-0000",
          findings: [{ version: "6.14.2", paths: [". > express@4.22.1 > qs@6.14.2"] }],
        },
      },
    }, { exceptions: [] });
    expect(report.advisories[0]).toMatchObject({
      package: "qs",
      installedVersion: "6.14.2",
      patchedVersion: ">=6.15.2",
      disposition: "BLOCKED_PATCHABLE_RUNTIME",
    });
  });
});
