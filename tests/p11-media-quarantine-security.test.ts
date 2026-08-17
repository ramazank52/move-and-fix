import { describe, expect, it, vi } from "vitest";
import { decideMediaQuarantineAccess } from "../server/security/MediaQuarantinePolicy";
import { registerStorageProxy } from "../server/_core/storageProxy";

describe("P11 media quarantine and legacy raw storage boundary", () => {
  it("releases only explicitly clean media and fails closed for every other state", () => {
    expect(decideMediaQuarantineAccess("clean")).toMatchObject({ allowed: true });
    expect(decideMediaQuarantineAccess("pending_scan")).toMatchObject({ allowed: false, reason: "MEDIA_QUARANTINE_PENDING_SCAN" });
    expect(decideMediaQuarantineAccess("blocked")).toMatchObject({ allowed: false, reason: "MEDIA_QUARANTINE_BLOCKED" });
    expect(decideMediaQuarantineAccess(undefined)).toMatchObject({ allowed: false, reason: "MEDIA_QUARANTINE_STATE_MISSING" });
  });

  it("does not redirect any legacy raw storage path to a signed URL", () => {
    const all = vi.fn();
    registerStorageProxy({ all } as never);
    expect(all).toHaveBeenCalledWith("/manus-storage/*", expect.any(Function));

    const handler = all.mock.calls[0]?.[1] as (_req: unknown, res: { set: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> }) => void;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const set = vi.fn();
    handler({}, { set, status });
    expect(set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(status).toHaveBeenCalledWith(410);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "LEGACY_RAW_STORAGE_DISABLED" }));
  });
});
