export type TurkeyVatQuote = {
  subtotalAmount: number;
  rateBasisPoints: number;
  taxAmount: number;
  totalAmount: number;
};

/**
 * Computes whole-TRY VAT with half-up rounding. The rate is supplied by a
 * versioned administrative rule; this module intentionally has no default
 * rate and therefore cannot silently quote tax for an unknown configuration.
 */
export function quoteTurkeyVat(input: {
  subtotalAmount: number;
  rateBasisPoints: number;
}): TurkeyVatQuote {
  if (!Number.isSafeInteger(input.subtotalAmount) || input.subtotalAmount < 0) {
    throw new Error("TAX_SUBTOTAL_INVALID");
  }
  if (!Number.isSafeInteger(input.rateBasisPoints) || input.rateBasisPoints < 0 || input.rateBasisPoints > 10_000) {
    throw new Error("TAX_RATE_INVALID");
  }

  const taxAmount = Math.floor((input.subtotalAmount * input.rateBasisPoints + 5_000) / 10_000);
  const totalAmount = input.subtotalAmount + taxAmount;
  if (!Number.isSafeInteger(totalAmount)) throw new Error("TAX_AMOUNT_OVERFLOW");

  return {
    subtotalAmount: input.subtotalAmount,
    rateBasisPoints: input.rateBasisPoints,
    taxAmount,
    totalAmount,
  };
}
