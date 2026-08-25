import { describe, expect, it } from "vitest";

import { DatabaseError, ValidationError } from "../server/_core/errors";
import { publicProcedure, router } from "../server/_core/trpc";

const testRouter = router({
  databaseFailure: publicProcedure.query(() => {
    throw new DatabaseError("mysql://user:password@private-host:4000/movefix");
  }),
  validationFailure: publicProcedure.query(() => {
    throw new ValidationError("Başlık zorunludur");
  }),
});

describe("P35 tRPC AppError redaction", () => {
  it("does not expose database error details to a caller", async () => {
    const caller = testRouter.createCaller({} as never);

    await expect(caller.databaseFailure()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "İşlem şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.",
    });
    await expect(caller.databaseFailure()).rejects.not.toThrow(/private-host|password|mysql/i);
  });

  it("preserves safe validation feedback", async () => {
    const caller = testRouter.createCaller({} as never);
    await expect(caller.validationFailure()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Başlık zorunludur",
    });
  });
});
