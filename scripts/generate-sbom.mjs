import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const packageStore = join(process.cwd(), "node_modules");
const outputDirectory = join(process.cwd(), "artifacts");
const entries = await readdir(packageStore, { withFileTypes: true });
const components = new Map();

const packageDirectories = [];
for (const entry of entries.filter((candidate) => candidate.isDirectory() && !candidate.name.startsWith("."))) {
  if (entry.name.startsWith("@")) {
    const scoped = await readdir(join(packageStore, entry.name), { withFileTypes: true });
    packageDirectories.push(...scoped.filter((candidate) => candidate.isDirectory()).map((candidate) => join(packageStore, entry.name, candidate.name)));
  } else {
    packageDirectories.push(join(packageStore, entry.name));
  }
}

for (const packageDirectory of packageDirectories) {
    try {
      const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
      const key = `${manifest.name}@${manifest.version}`;
      components.set(key, {
        type: "library",
        name: manifest.name,
        version: manifest.version,
        purl: `pkg:npm/${encodeURIComponent(manifest.name)}@${encodeURIComponent(manifest.version)}`,
        licenses: manifest.license ? [{ license: { id: typeof manifest.license === "string" ? manifest.license : manifest.license.type } }] : [],
      });
    } catch {
      // The lockfile/package manager remains the source of integrity truth; unreadable manifests are excluded.
    }
}

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: "urn:uuid:move-and-fix-sbom-v1",
  version: 1,
  metadata: {
    component: { type: "application", name: "move-and-fix" },
  },
  components: [...components.values()].sort((left, right) => left.purl.localeCompare(right.purl)),
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "sbom.cdx.json"), JSON.stringify(sbom, null, 2) + "\n", "utf8");
console.log(`Generated CycloneDX 1.5 SBOM with ${sbom.components.length} components.`);
