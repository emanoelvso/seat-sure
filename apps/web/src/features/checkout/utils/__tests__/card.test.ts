import { describe, expect, it } from "vitest";
import {
  brandLabel,
  detectBrand,
  formatCardNumber,
  formatExpiryInput,
  maskedNumber,
  normalizeNumber,
  validateCard,
} from "@/features/checkout/utils/card";

// Builds a Luhn-valid digit string of exactly `length`, from a repeating
// prefix, by appending a computed check digit. Mirrors the API's
// card-rules.spec.ts fixture builder so both suites exercise the same
// boundaries.
const luhnChecksum = (digits: string): number => {
  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    double = !double;
  }

  return sum % 10;
};

const luhnValidNumber = (length: number, prefix = "4"): string => {
  const base = prefix.padEnd(length - 1, "0");
  const checkDigit = (10 - luhnChecksum(`${base}0`)) % 10;
  return `${base}${checkDigit}`;
};

const VALID_HOLDER = "Jane Doe";
const NOW = new Date("2026-06-15T00:00:00.000Z");
const VALID_EXPIRY = "06/26";

const buildCard = (overrides: Partial<Parameters<typeof validateCard>[0]>) => ({
  number: luhnValidNumber(16),
  holder: VALID_HOLDER,
  expiry: VALID_EXPIRY,
  cvv: "123",
  ...overrides,
});

describe("card number (PAY-44)", () => {
  it("passes a Luhn-valid 13-digit number", () => {
    expect(validateCard(buildCard({ number: luhnValidNumber(13) }), NOW).number).toBe(
      "",
    );
  });

  it("passes a Luhn-valid 19-digit number", () => {
    expect(validateCard(buildCard({ number: luhnValidNumber(19) }), NOW).number).toBe(
      "",
    );
  });

  it("fails a Luhn-valid 12-digit number (too short)", () => {
    expect(validateCard(buildCard({ number: luhnValidNumber(12) }), NOW).number).toBe(
      "Enter a valid card number",
    );
  });

  it("fails a Luhn-valid 20-digit number (too long)", () => {
    expect(validateCard(buildCard({ number: luhnValidNumber(20) }), NOW).number).toBe(
      "Enter a valid card number",
    );
  });

  it("fails a Luhn-invalid 16-digit number", () => {
    const valid = luhnValidNumber(16);
    const lastDigit = Number(valid[valid.length - 1]);
    const invalid = `${valid.slice(0, -1)}${(lastDigit + 1) % 10}`;

    expect(validateCard(buildCard({ number: invalid }), NOW).number).toBe(
      "Enter a valid card number",
    );
  });

  it("ignores spaces in the number", () => {
    const valid = luhnValidNumber(16);
    const spaced = valid.replace(/(.{4})/g, "$1 ").trim();

    expect(validateCard(buildCard({ number: spaced }), NOW).number).toBe("");
  });
});

describe("holder (PAY-44)", () => {
  it("fails a 1-character holder", () => {
    expect(validateCard(buildCard({ holder: "A" }), NOW).holder).toBe(
      "Enter the name on the card",
    );
  });

  it("passes a 2-character holder", () => {
    expect(validateCard(buildCard({ holder: "Al" }), NOW).holder).toBe("");
  });

  it("passes a 50-character holder", () => {
    expect(validateCard(buildCard({ holder: "A".repeat(50) }), NOW).holder).toBe(
      "",
    );
  });

  it("fails a 51-character holder", () => {
    expect(validateCard(buildCard({ holder: "A".repeat(51) }), NOW).holder).toBe(
      "Enter the name on the card",
    );
  });
});

describe("expiry (PAY-44)", () => {
  it("fails month 00", () => {
    expect(validateCard(buildCard({ expiry: "00/30" }), NOW).expiry).toBe(
      "Enter a valid expiry date",
    );
  });

  it("fails month 13", () => {
    expect(validateCard(buildCard({ expiry: "13/30" }), NOW).expiry).toBe(
      "Enter a valid expiry date",
    );
  });

  it("fails last month", () => {
    expect(validateCard(buildCard({ expiry: "05/26" }), NOW).expiry).toBe(
      "Enter a valid expiry date",
    );
  });

  it("passes the current month", () => {
    expect(validateCard(buildCard({ expiry: "06/26" }), NOW).expiry).toBe("");
  });
});

describe("cvv (PAY-44)", () => {
  const visaNumber = luhnValidNumber(16, "4");
  const amexNumber = luhnValidNumber(15, "34");

  it("passes 3 digits for a Visa number", () => {
    expect(
      validateCard(buildCard({ number: visaNumber, cvv: "123" }), NOW).cvv,
    ).toBe("");
  });

  it("fails 4 digits for a Visa number", () => {
    expect(
      validateCard(buildCard({ number: visaNumber, cvv: "1234" }), NOW).cvv,
    ).toBe("Enter a valid CVV");
  });

  it("passes 4 digits for an Amex number", () => {
    expect(
      validateCard(buildCard({ number: amexNumber, cvv: "1234" }), NOW).cvv,
    ).toBe("");
  });

  it("fails 3 digits for an Amex number", () => {
    expect(
      validateCard(buildCard({ number: amexNumber, cvv: "123" }), NOW).cvv,
    ).toBe("Enter a valid CVV");
  });

  it.each(["51", "2221"])(
    "passes 3 digits for a Mastercard number starting with %s",
    (prefix) => {
      expect(
        validateCard(
          buildCard({ number: luhnValidNumber(16, prefix), cvv: "123" }),
          NOW,
        ).cvv,
      ).toBe("");
    },
  );

  it("fails 4 digits for a Mastercard number", () => {
    expect(
      validateCard(
        buildCard({ number: luhnValidNumber(16, "51"), cvv: "1234" }),
        NOW,
      ).cvv,
    ).toBe("Enter a valid CVV");
  });

  it("passes 3 digits for a generic card number", () => {
    expect(
      validateCard(
        buildCard({ number: luhnValidNumber(16, "6011"), cvv: "123" }),
        NOW,
      ).cvv,
    ).toBe("");
  });

  it("fails 4 digits for a generic card number", () => {
    expect(
      validateCard(
        buildCard({ number: luhnValidNumber(16, "6011"), cvv: "1234" }),
        NOW,
      ).cvv,
    ).toBe("Enter a valid CVV");
  });
});

describe("detectBrand / brandLabel", () => {
  it("detects visa for a number starting with 4", () => {
    expect(detectBrand("4242424242424242")).toBe("visa");
    expect(brandLabel("visa")).toBe("Visa");
  });

  it("detects mastercard for a 2-digit prefix of 51-55", () => {
    expect(detectBrand("5100000000000000")).toBe("mastercard");
    expect(detectBrand("5500000000000000")).toBe("mastercard");
    expect(brandLabel("mastercard")).toBe("Mastercard");
  });

  it("detects mastercard for a 4-digit prefix of 2221-2720", () => {
    expect(detectBrand("2221000000000000")).toBe("mastercard");
    expect(detectBrand("2720000000000000")).toBe("mastercard");
  });

  it("detects card (not mastercard) for a 4-digit prefix of 2721", () => {
    expect(detectBrand("2721000000000000")).toBe("card");
  });

  it.each([
    ["50", "card"],
    ["51", "mastercard"],
    ["55", "mastercard"],
    ["56", "card"],
    ["2220", "card"],
    ["2221", "mastercard"],
    ["2720", "mastercard"],
    ["2721", "card"],
  ])("detects %s on the mastercard range edge as %s (PAY-32)", (prefix, brand) => {
    const number = luhnValidNumber(16, prefix);

    expect(validateCard(buildCard({ number }), NOW).number).toBe("");
    expect(detectBrand(number)).toBe(brand);
  });

  it("detects amex for a prefix of 34 or 37", () => {
    expect(detectBrand("340000000000000")).toBe("amex");
    expect(detectBrand("370000000000000")).toBe("amex");
    expect(brandLabel("amex")).toBe("American Express");
  });

  it("falls back to card for an unrecognized prefix", () => {
    expect(detectBrand("6011000000000000")).toBe("card");
    expect(brandLabel("card")).toBe("Card");
  });
});

describe("formatCardNumber (PAY-29)", () => {
  it("groups a Visa-length number in blocks of 4", () => {
    expect(formatCardNumber("4242424242424242")).toBe(
      "4242 4242 4242 4242",
    );
  });

  it("groups an Amex number 4-6-5", () => {
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
  });

  it("cuts a 25-digit paste to 19 digits", () => {
    const pasted = "1".repeat(25);
    const digitsOnly = formatCardNumber(pasted).replace(/\s/g, "");
    expect(digitsOnly).toHaveLength(19);
  });

  it("drops non-digit characters", () => {
    expect(formatCardNumber("4242-4242-4242-4242")).toBe(
      "4242 4242 4242 4242",
    );
  });
});

describe("maskedNumber (PAY-32)", () => {
  it("masks every digit but the last 4", () => {
    expect(maskedNumber("4242424242424242")).toBe(
      "•••• •••• •••• 4242",
    );
  });

  it("masks all 4 groups while fewer than 4 digits are entered", () => {
    expect(maskedNumber("42")).toBe(
      "•••• •••• •••• ••••",
    );
  });
});

describe("formatExpiryInput", () => {
  it("inserts the slash after the month once 3 digits are typed", () => {
    expect(formatExpiryInput("083")).toBe("08/3");
  });

  it("keeps a 2-digit month without a slash", () => {
    expect(formatExpiryInput("08")).toBe("08");
  });

  it("caps at 4 digits (MMYY)", () => {
    expect(formatExpiryInput("0812345")).toBe("08/12");
  });
});

describe("normalizeNumber", () => {
  it("strips spaces", () => {
    expect(normalizeNumber("4242 4242 4242 4242")).toBe("4242424242424242");
  });
});
