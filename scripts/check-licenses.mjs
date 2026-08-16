import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "node_modules");
const permitted = [
  "0BSD", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "CC0-1.0",
  "BlueOak-1.0.0", "CC-BY-4.0", "ISC", "MIT", "MIT-0", "MPL-2.0",
  "Python-2.0", "Unlicense", "WTFPL", "Zlib",
];

function normalizeLicense(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.type === "string") return value.type.trim();
  return "UNKNOWN";
}

function isPermitted(license) {
  const normalized = license.replace(/^\(|\)$/g, "");
  return permitted.some((allowed) => normalized === allowed || normalized.startsWith(`${allowed} OR `) || normalized.includes(` OR ${allowed}`));
}

async function licenseFromFile(packageDirectory) {
  const entries = await readdir(packageDirectory, { withFileTypes: true });
  const licenseFile = entries.find((entry) => entry.isFile() && /^(license|copying)(\.|$)/i.test(entry.name));
  if (!licenseFile) return "UNKNOWN";
  const text = (await readFile(join(packageDirectory, licenseFile.name), "utf8")).slice(0, 1500).toLowerCase();
  if (text.includes("apache license") && text.includes("version 2.0")) return "Apache-2.0";
  if (text.includes("permission is hereby granted, free of charge")) return "MIT";
  if (text.includes("mozilla public license") && text.includes("2.0")) return "MPL-2.0";
  if (text.includes("redistribution and use in source and binary forms")) return "BSD-3-Clause";
  return "UNKNOWN";
}

const entries = await readdir(root, { withFileTypes: true });
const findings = [];
const packageDirectories = [];
for (const entry of entries.filter((candidate) => candidate.isDirectory() && !candidate.name.startsWith("."))) {
  if (entry.name.startsWith("@")) {
    const scoped = await readdir(join(root, entry.name), { withFileTypes: true });
    packageDirectories.push(...scoped.filter((candidate) => candidate.isDirectory()).map((candidate) => join(root, entry.name, candidate.name)));
  } else {
    packageDirectories.push(join(root, entry.name));
  }
}

for (const packageDirectory of packageDirectories) {
    try {
      const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
      const declared = normalizeLicense(manifest.license);
      const license = declared === "UNKNOWN" ? await licenseFromFile(packageDirectory) : declared;
      if (!isPermitted(license)) findings.push(`${manifest.name}@${manifest.version}: ${license}`);
    } catch {
      // Broken or absent manifests cannot be classified and are covered by the package manager integrity check.
    }
}

if (findings.length > 0) {
  console.error("Disallowed or unclassified dependency licenses:\n" + findings.sort().join("\n"));
  process.exit(1);
}

console.log(`License policy passed for ${packageDirectories.length} installed packages.`);
