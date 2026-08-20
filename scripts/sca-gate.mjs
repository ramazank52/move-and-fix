import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EXCEPTIONS_PATH = join(ROOT, "docs", "compliance", "P17_SCA_EXCEPTIONS.json");
const DEFAULT_ARTIFACT_DIRECTORY = join(ROOT, "artifacts", "sca");
const BLOCKING_SEVERITIES = new Set(["critical", "high"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function advisoryIdFromVia(via) {
  if (typeof via?.url === "string") {
    const match = via.url.match(/GHSA-[a-z0-9-]+/i);
    if (match) return match[0].toUpperCase();
  }
  return typeof via?.source === "string" ? via.source : null;
}

function installedVersion(packageName, dependencyPaths, auditVersion) {
  if (typeof auditVersion === "string" && auditVersion.length > 0) return auditVersion;
  for (const dependencyPath of dependencyPaths) {
    try {
      return JSON.parse(readFileSync(join(ROOT, dependencyPath, "package.json"), "utf8")).version ?? "UNKNOWN";
    } catch {
      // Audit nodes can point to hoisted or pruned locations. Continue deterministically.
    }
  }
  try {
    return JSON.parse(readFileSync(join(ROOT, "node_modules", packageName, "package.json"), "utf8")).version ?? "UNKNOWN";
  } catch {
    return "NOT_INSTALLED";
  }
}

function classifySurface(record) {
  const pathText = record.dependencyPaths.join(" ").toLowerCase();
  const packageText = record.package.toLowerCase();
  if (["image-size", "uuid"].includes(packageText)
    || /(^|[/@-])(expo|metro)([/@-]|$)/.test(pathText)) {
    return "toolchain";
  }
  return "runtime";
}

function matchesException(record, exception) {
  return exception.advisoryId === record.advisoryId
    && exception.package === record.package
    && exception.installedVersion === record.installedVersion
    && record.dependencyPaths.some((path) => path.includes(exception.dependencyPath));
}

function normalizeAudit(audit) {
  if (audit?.advisories && typeof audit.advisories === "object") {
    return Object.values(audit.advisories).flatMap((advisory) => asArray(advisory.findings).map((finding) => ({
      advisoryId: advisory.github_advisory_id ?? `UNKNOWN:${advisory.module_name ?? "package"}`,
      package: advisory.module_name ?? "UNKNOWN",
      installedVersion: finding.version ?? "UNKNOWN",
      severity: String(advisory.severity ?? "unknown").toLowerCase(),
      affected: advisory.vulnerable_versions ?? "UNKNOWN",
      patchedVersion: advisory.patched_versions === "<0.0.0" ? "NO_PATCH_DECLARED" : (advisory.patched_versions ?? "NO_PATCH_DECLARED"),
      dependencyPaths: asArray(finding.paths),
      source: advisory.url ?? "UNKNOWN",
    })));
  }
  const vulnerabilities = audit?.vulnerabilities ?? {};
  return Object.entries(vulnerabilities).flatMap(([packageName, vulnerability]) => {
    const dependencyPaths = asArray(vulnerability.nodes);
    return asArray(vulnerability.via)
      .filter((via) => typeof via === "object" && via !== null)
      .map((via) => ({
        advisoryId: advisoryIdFromVia(via) ?? `UNKNOWN:${packageName}`,
        package: via.name ?? packageName,
        installedVersion: installedVersion(via.name ?? packageName, dependencyPaths, vulnerability.version),
        severity: String(via.severity ?? vulnerability.severity ?? "unknown").toLowerCase(),
        affected: via.range ?? "UNKNOWN",
        patchedVersion: via.fixAvailable?.version ?? "NO_PATCH_DECLARED",
        dependencyPaths,
        source: via.url ?? "UNKNOWN",
      }));
  });
}

export function evaluateAudit(audit, exceptionConfig) {
  const exceptions = asArray(exceptionConfig?.exceptions);
  const unique = new Map();
  for (const record of normalizeAudit(audit)) {
    const key = `${record.advisoryId}|${record.package}|${record.installedVersion}`;
    const existing = unique.get(key);
    if (existing) {
      existing.dependencyPaths = [...new Set([...existing.dependencyPaths, ...record.dependencyPaths])];
    } else {
      unique.set(key, record);
    }
  }

  const advisories = [...unique.values()].map((record) => {
    const exception = exceptions.find((candidate) => matchesException(record, candidate));
    const surface = classifySurface(record);
    const patchable = record.patchedVersion !== "NO_PATCH_DECLARED" && record.patchedVersion !== "false";
    const blocksRelease = BLOCKING_SEVERITIES.has(record.severity)
      && !exception
      && (surface === "toolchain" || (surface === "runtime" && patchable));
    return {
      ...record,
      surface,
      patchable,
      disposition: exception
        ? "APPROVED_TOOLCHAIN_EXCEPTION"
        : blocksRelease
          ? surface === "toolchain"
            ? "UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED"
            : "BLOCKED_PATCHABLE_RUNTIME"
          : surface === "toolchain"
            ? "UNAPPROVED_TOOLCHAIN_REVIEW_REQUIRED"
            : "NON_BLOCKING_REVIEW_REQUIRED",
      exception: exception ?? null,
      blocksRelease,
    };
  });

  const counts = advisories.reduce((summary, advisory) => {
    summary.total += 1;
    summary[advisory.severity] = (summary[advisory.severity] ?? 0) + 1;
    if (advisory.blocksRelease) summary.blocking += 1;
    if (advisory.exception) summary.approvedExceptions += 1;
    return summary;
  }, { total: 0, blocking: 0, approvedExceptions: 0 });

  return {
    schemaVersion: "p17-sca-v1",
    generatedAt: new Date().toISOString(),
    gate: counts.blocking === 0 ? "PASS" : "FAIL",
    counts,
    advisories,
  };
}

function renderMarkdown(report, historicalEvidenceStatus) {
  const rows = report.advisories.map((advisory) => [
    advisory.advisoryId,
    `${advisory.package}@${advisory.installedVersion}`,
    advisory.severity,
    advisory.surface,
    advisory.patchedVersion,
    advisory.disposition,
  ].map((cell) => String(cell).replaceAll("|", "\\|")).join(" | "));
  return [
    "# P17 Deterministic SCA Report",
    "",
    `- **Gate:** ${report.gate}`,
    `- **Distinct advisory identities:** ${report.counts.total}`,
    `- **Blocking release advisories:** ${report.counts.blocking}`,
    `- **Approved upstream/toolchain exceptions:** ${report.counts.approvedExceptions}`,
    `- **Historical P16 raw audit evidence:** ${historicalEvidenceStatus}`,
    "",
    "| Advisory | Installed package | Severity | Surface | Patched version | Disposition |",
    "|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
    "",
    "Each row is derived from the same `pnpm audit --prod --json` input as `sca-report.json`; CI fails when a high/critical **patchable runtime** finding or an **unapproved high/critical toolchain** finding remains. Toolchain exceptions require an exact advisory/package/version/path review record.",
    "",
  ].join("\n");
}

function runAudit() {
  try {
    return execFileSync("pnpm", ["audit", "--prod", "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return String(error.stdout ?? "");
  }
}

function main() {
  const outputDirectory = process.env.SCA_ARTIFACT_DIRECTORY ?? DEFAULT_ARTIFACT_DIRECTORY;
  mkdirSync(outputDirectory, { recursive: true });
  const rawAudit = runAudit();
  let audit;
  try {
    audit = JSON.parse(rawAudit);
  } catch {
    console.error("SCA_GATE_ERROR: pnpm audit JSON çıktısı ayrıştırılamadı.");
    process.exitCode = 1;
    return;
  }
  const exceptionConfig = JSON.parse(readFileSync(DEFAULT_EXCEPTIONS_PATH, "utf8"));
  const report = evaluateAudit(audit, exceptionConfig);
  const historicalP16Path = join(ROOT, "artifacts", "P16_PNPM_AUDIT.json");
  const historicalEvidenceStatus = existsSync(historicalP16Path)
    ? "PRESENT"
    : "MISSING_FROM_TRACKED_HISTORY — P17 raw audit is preserved; P16 raw audit must be supplied from immutable audit evidence, not recreated.";

  writeFileSync(join(outputDirectory, "pnpm-audit-prod.json"), `${rawAudit.trim()}\n`);
  writeFileSync(join(outputDirectory, "sca-report.json"), `${JSON.stringify({ ...report, historicalEvidenceStatus }, null, 2)}\n`);
  writeFileSync(join(outputDirectory, "sca-report.md"), renderMarkdown(report, historicalEvidenceStatus));
  console.log(`SCA_GATE=${report.gate}`);
  console.log(`SCA_ADVISORIES=${report.counts.total}`);
  console.log(`SCA_BLOCKING_RELEASE=${report.counts.blocking}`);
  console.log(`SCA_APPROVED_EXCEPTIONS=${report.counts.approvedExceptions}`);
  if (report.gate !== "PASS") process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
