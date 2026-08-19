import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());
const appRoot = join(projectRoot, "app");
const forbiddenDevRoute = join(appRoot, "dev", "theme-lab.tsx");

function collectRouteModules(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return collectRouteModules(path);
    return /\.(?:ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("package and sample hygiene", () => {
  it("does not retain the retired theme laboratory as an Expo Router module", () => {
    expect(existsSync(forbiddenDevRoute)).toBe(false);
  });

  it("keeps the app/dev route group free of executable sample screens", () => {
    expect(collectRouteModules(join(appRoot, "dev"))).toEqual([]);
  });
});
