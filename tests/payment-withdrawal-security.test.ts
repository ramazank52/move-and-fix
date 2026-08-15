import { scryptSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getProviderProfile: vi.fn(),
    getUserByEmailNormalized: vi.fn(),
    getActiveAuthChallenge: vi.fn(),
    getLatestActiveAuthChallenge: vi.fn(),
    incrementAuthChallengeAttempts: vi.fn(),
    markAuthChallengeUsed: vi.fn(),
    requestWalletWithdrawal: vi.fn(),
  };
});

import * as walletDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const validIban = "TR120006200119000006672951";
const idempotencyKey = "withdrawal-security-key-0001";
const reauthPassword = "StrongPassphrase!42";
const reauthCode = "123456";
const passwordHash = `scrypt-v1$0123456789abcdef0123456789abcdef$${scryptSync(reauthPassword, "0123456789abcdef0123456789abcdef", 64).toString("hex")}`;

function createContext(id = 87): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `withdrawal-${id}`,
    email: `withdrawal-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Withdrawal Security Test",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const verifiedProvider = {
  id: 301,
  userId: 87,
  isVerified: 1,
  verificationStatus: "approved",
  verificationReviewedAt: new Date(),
};

describe("wallet withdrawal security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletDb.getUserByEmailNormalized).mockResolvedValue({
      user: { id: 87 },
      credential: { passwordHash },
    } as never);
    vi.mocked(walletDb.getActiveAuthChallenge).mockResolvedValue({ id: 901 } as never);
  });

  it("accepts only a normalized 26-character Turkish IBAN", () => {
    expect(walletDb.normalizeTurkishIban(" tr12 0006 2001 1900 0006 6729 51 ")).toBe(validIban);
    expect(walletDb.normalizeTurkishIban("DE89370400440532013000")).toBeNull();
    expect(walletDb.normalizeTurkishIban("TR12000620011900000667295")).toBeNull();
    expect(walletDb.normalizeTurkishIban("TR12000620011900000667295A")).toBeNull();
  });

  it("requires an approved profile, verified flag and verification timestamp in the data-layer policy", () => {
    expect(walletDb.isWalletWithdrawalProviderEligible(null)).toBe(false);
    expect(walletDb.isWalletWithdrawalProviderEligible({ ...verifiedProvider, isVerified: 0 })).toBe(false);
    expect(walletDb.isWalletWithdrawalProviderEligible({ ...verifiedProvider, verificationStatus: "pending" })).toBe(false);
    expect(walletDb.isWalletWithdrawalProviderEligible({ ...verifiedProvider, verificationReviewedAt: null })).toBe(false);
    expect(walletDb.isWalletWithdrawalProviderEligible(verifiedProvider)).toBe(true);
  });

  it("blocks a customer profile before it can invoke the withdrawal data-layer mutation", async () => {
    vi.mocked(walletDb.getProviderProfile).mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wallet.withdraw({ amount: 500, bankAccountId: validIban, idempotencyKey, reauthPassword, reauthCode }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(walletDb.requestWalletWithdrawal).not.toHaveBeenCalled();
  });

  it("rejects an invalid IBAN before any provider lookup or balance operation", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wallet.withdraw({ amount: 500, bankAccountId: "TR123", idempotencyKey, reauthPassword, reauthCode }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(walletDb.getProviderProfile).not.toHaveBeenCalled();
    expect(walletDb.requestWalletWithdrawal).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN when a verified provider lacks available balance", async () => {
    vi.mocked(walletDb.getProviderProfile).mockResolvedValue(verifiedProvider as never);
    vi.mocked(walletDb.requestWalletWithdrawal).mockRejectedValue(
      new walletDb.WalletWithdrawalError("INSUFFICIENT_BALANCE", "Yetersiz kullanılabilir bakiye"),
    );
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wallet.withdraw({ amount: 500, bankAccountId: validIban, idempotencyKey, reauthPassword, reauthCode }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "Yetersiz kullanılabilir bakiye" });
  });

  it("passes only authenticated provider-owned withdrawal fields to the data layer", async () => {
    vi.mocked(walletDb.getProviderProfile).mockResolvedValue(verifiedProvider as never);
    vi.mocked(walletDb.requestWalletWithdrawal).mockResolvedValue({
      transaction: { id: 901, status: "pending" } as never,
      duplicated: false,
    });
    const caller = appRouter.createCaller(createContext());

    await caller.wallet.withdraw({ amount: 500, bankAccountId: validIban, idempotencyKey, reauthPassword, reauthCode });

    expect(walletDb.markAuthChallengeUsed).toHaveBeenCalledWith(901);
    expect(walletDb.requestWalletWithdrawal).toHaveBeenCalledWith({
      userId: 87,
      amount: 500,
      bankAccountId: validIban,
      idempotencyKey,
    });
  });

  it("rejects a wrong password before it can consume a second-factor challenge or create a withdrawal", async () => {
    vi.mocked(walletDb.getProviderProfile).mockResolvedValue(verifiedProvider as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wallet.withdraw({
      amount: 500,
      bankAccountId: validIban,
      idempotencyKey,
      reauthPassword: "yanlis-parola",
      reauthCode,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(walletDb.getActiveAuthChallenge).not.toHaveBeenCalled();
    expect(walletDb.requestWalletWithdrawal).not.toHaveBeenCalled();
  });

  it("rejects an invalid second-factor code before it can create a withdrawal", async () => {
    vi.mocked(walletDb.getProviderProfile).mockResolvedValue(verifiedProvider as never);
    vi.mocked(walletDb.getActiveAuthChallenge).mockResolvedValue(null);
    vi.mocked(walletDb.getLatestActiveAuthChallenge).mockResolvedValue({ id: 902 } as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wallet.withdraw({ amount: 500, bankAccountId: validIban, idempotencyKey, reauthPassword, reauthCode }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(walletDb.incrementAuthChallengeAttempts).toHaveBeenCalledWith(902);
    expect(walletDb.requestWalletWithdrawal).not.toHaveBeenCalled();
  });
});
