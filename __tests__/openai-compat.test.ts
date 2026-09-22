/** @jest-environment node */
/**
 * OpenAI互換レイヤ（lib/openai.ts）のテスト
 *
 * gpt-5系・gpt-6系にmax_tokensやtemperatureを送るとAPIが400を返す。
 * モデル名の接頭辞で経路を分けているため、新しい世代が旧経路に落ちないことを固定する。
 */

const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import {
  chatCompletion,
  doesNotSupportTemperature,
  getDefaultModel,
  requiresMaxCompletionTokens,
} from "@/lib/openai";

describe("モデル判定", () => {
  it.each(["gpt-6-luna", "gpt-5.6-luna", "o1-mini", "o3"])(
    "%s はmax_completion_tokensを使い、temperatureを送らない",
    (model) => {
      expect(requiresMaxCompletionTokens(model)).toBe(true);
      expect(doesNotSupportTemperature(model)).toBe(true);
    }
  );

  it("gpt-4oはmax_tokensとtemperatureの経路のまま", () => {
    expect(requiresMaxCompletionTokens("gpt-4o")).toBe(false);
    expect(doesNotSupportTemperature("gpt-4o")).toBe(false);
  });
});

describe("chatCompletionのリクエストボディ", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_MODEL;
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      model: "gpt-6-luna",
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
    });
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  });

  it("既定モデルはgpt-6-luna", () => {
    expect(getDefaultModel()).toBe("gpt-6-luna");
  });

  it("gpt-6-lunaにはmax_tokensとtemperatureを送らない", async () => {
    await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.7,
      maxTokens: 1500,
    });
    const body = mockCreate.mock.calls[0][0];
    expect(body.model).toBe("gpt-6-luna");
    expect(body.max_completion_tokens).toBe(1500);
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("temperature");
  });
});
