import { describe, expect, it } from "vitest";

import {
  translateMessageOnDemand,
  type MessageTranslationInvoker,
} from "../server/ai/OnDemandMessageTranslation";

const successfulInvoker: MessageTranslationInvoker = async () => ({
  id: "translation-1",
  created: 0,
  model: "test-model",
  choices: [{
    index: 0,
    message: { role: "assistant", content: JSON.stringify({ translatedText: "The plumber is on the way.", sourceLanguage: "tr" }) },
    finish_reason: "stop",
  }],
});

describe("on-demand message translation", () => {
  it("returns structured translation without creating persistence or business assertions", async () => {
    await expect(
      translateMessageOnDemand(
        { sourceText: "Usta yolda.", targetLanguage: "en" },
        successfulInvoker,
      ),
    ).resolves.toMatchObject({
      status: "translated",
      targetLanguage: "en",
      translatedText: "The plumber is on the way.",
      sourceLanguage: "tr",
      translationProvider: "manus_builtin_llm",
      model: "managed",
      modelVersion: "managed",
      translationVersion: "p14-1",
    });
    const result = await translateMessageOnDemand(
      { sourceText: "Usta yolda.", targetLanguage: "en" },
      successfulInvoker,
    );
    expect(result.status === "translated" ? result.sourceHash : "").toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when the language is unsupported or source text is outside the processing limit", async () => {
    await expect(
      translateMessageOnDemand({ sourceText: "Merhaba", targetLanguage: "xx" }, successfulInvoker),
    ).resolves.toEqual({ status: "unavailable", code: "TRANSLATION_UNAVAILABLE" });
    await expect(
      translateMessageOnDemand({ sourceText: "x".repeat(5001), targetLanguage: "tr" }, successfulInvoker),
    ).resolves.toEqual({ status: "unavailable", code: "TRANSLATION_UNAVAILABLE" });
  });

  it("does not use malformed model output", async () => {
    const invalidOutput: MessageTranslationInvoker = async () => ({
      id: "translation-2",
      created: 0,
      model: "test-model",
      choices: [{ index: 0, message: { role: "assistant", content: "not-json" }, finish_reason: "stop" }],
    });
    await expect(
      translateMessageOnDemand({ sourceText: "Merhaba", targetLanguage: "en" }, invalidOutput),
    ).resolves.toEqual({ status: "unavailable", code: "TRANSLATION_INVALID_OUTPUT" });
  });

  it("does not surface a provider error or synthesize a translation", async () => {
    const failingInvoker: MessageTranslationInvoker = async () => {
      throw new Error("provider unavailable");
    };
    await expect(
      translateMessageOnDemand({ sourceText: "Merhaba", targetLanguage: "en" }, failingInvoker),
    ).resolves.toEqual({ status: "unavailable", code: "TRANSLATION_UNAVAILABLE" });
  });
});
