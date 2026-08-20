import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";

describe("P16 Masraf Dosyası semantic evidence ve sohbet geçişi", () => {
  it("semantic evidence rollerini, karantina temizliği kontrolünü ve no-debt refund kararını server tarafında korur", async () => {
    const [database, router] = await Promise.all([
      readFile(fileURLToPath(new URL("../server/db.ts", import.meta.url)), "utf8"),
      readFile(fileURLToPath(new URL("../server/routers.ts", import.meta.url)), "utf8"),
    ]);

    expect(database).toContain("EXPENSE_EVIDENCE_ROLE_KIND_INVALID");
    expect(database).toContain("mediaRole");
    expect(database).toContain('available: item.quarantineStatus === "clean"');
    expect(database).toContain("creates a customer charge, wallet movement, or payment-gateway action");
    expect(router).toContain('z.enum(["receipt", "invoice", "product", "material", "video", "other"])');
  });

  it("formdaki semantic metadata ve sohbet geçişini yalnız mevcut request bağlamına bağlar", async () => {
    const [expenseScreen, chatScreen, i18n] = await Promise.all([
      readFile(fileURLToPath(new URL("../app/expenses/[requestId].tsx", import.meta.url)), "utf8"),
      readFile(fileURLToPath(new URL("../app/chat/[id].tsx", import.meta.url)), "utf8"),
      readFile(fileURLToPath(new URL("../lib/i18n-core.ts", import.meta.url)), "utf8"),
    ]);

    expect(expenseScreen).toContain("brand");
    expect(expenseScreen).toContain("model");
    expect(expenseScreen).toContain("quantity");
    expect(expenseScreen).toContain("locationUrl");
    expect(expenseScreen).toContain("mediaRole: evidenceRole");
    expect(chatScreen).toContain("hasValidConversationContext && requestId");
    expect(chatScreen).toContain("/expenses/${requestId}");
    expect(i18n).toContain('"chat.expenseFile"');
    expect(i18n).toContain('"chat.expenseFileAccessibility"');
  });
});
