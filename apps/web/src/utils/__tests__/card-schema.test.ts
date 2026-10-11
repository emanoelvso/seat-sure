import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateCard } from "@/utils/card";
import { cardSchema } from "@/utils/card-schema";

vi.mock("@/utils/card", () => ({ validateCard: vi.fn() }));

const validateCardMock = vi.mocked(validateCard);

const input = {
  number: "4111111111111111",
  holder: "Ada Lovelace",
  expiry: "12/99",
  cvv: "123",
};

const noErrors = { number: "", holder: "", expiry: "", cvv: "" };

beforeEach(() => {
  validateCardMock.mockReset();
});

describe("cardSchema (TEST-06)", () => {
  it("maps a validateCard error to an issue at [field] with the same message", () => {
    validateCardMock.mockReturnValue({ ...noErrors, cvv: "CVV message" });

    const result = cardSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0].path).toEqual(["cvv"]);
    expect(result.error?.issues[0].message).toBe("CVV message");
  });

  it("returns the input unchanged when validateCard reports no errors", () => {
    validateCardMock.mockReturnValue(noErrors);

    const result = cardSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  it("reports one issue per failing field", () => {
    validateCardMock.mockReturnValue({
      ...noErrors,
      number: "Number message",
      expiry: "Expiry message",
    });

    const result = cardSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => [issue.path, issue.message]),
    ).toEqual([
      [["number"], "Number message"],
      [["expiry"], "Expiry message"],
    ]);
  });
});
