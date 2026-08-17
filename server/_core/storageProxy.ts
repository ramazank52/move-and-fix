import type { Express } from "express";
export function registerStorageProxy(app: Express) {
  app.all("/manus-storage/*", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(410).json({
      code: "LEGACY_RAW_STORAGE_DISABLED",
      message: "Direct storage access is disabled. Use an authorized opaque media endpoint.",
    });
  });
}
