// Pure card formatting and validation (PAY-27..32, PAY-44). Mirrors
// apps/api/src/module/billing/core/util/card-rules.ts rule-for-rule and
// message-for-message: the API repeats them because the client can't be
// trusted (spec Assumptions, "Card validation rules"). Kept as a separate
// copy per AD-019/the design's Code Reuse Analysis - the commit rule
// (apps/ only) rules out a shared package.

export type CardBrand = "visa" | "mastercard" | "amex" | "card";

export interface CardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export type CardFieldErrors = Record<
  "number" | "holder" | "expiry" | "cvv",
  string
>;

const MESSAGES = {
  number: "Enter a valid card number",
  holder: "Enter the name on the card",
  expiry: "Enter a valid expiry date",
  cvv: "Enter a valid CVV",
} as const;

export const normalizeNumber = (number: string): string =>
  number.replace(/\s+/g, "");

const onlyDigits = (value: string): string => value.replace(/\D/g, "");

// Luhn checksum over a digit string (spaces/other characters not stripped
// here - callers normalize first).
export const luhn = (digits: string): boolean => {
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

export const detectBrand = (number: string): CardBrand => {
  const digits = normalizeNumber(number);

  if (/^4/.test(digits)) {
    return "visa";
  }

  const twoDigitPrefix = Number(digits.slice(0, 2));
  const fourDigitPrefix = Number(digits.slice(0, 4));

  if (
    (twoDigitPrefix >= 51 && twoDigitPrefix <= 55) ||
    (fourDigitPrefix >= 2221 && fourDigitPrefix <= 2720)
  ) {
    return "mastercard";
  }

  if (/^3[47]/.test(digits)) {
    return "amex";
  }

  return "card";
};

export const brandLabel = (brand: CardBrand): string => {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "American Express";
    default:
      return "Card";
  }
};

// Groups digits for display: 4-4-4-4(-...) for every brand except American
// Express (4-6-5), capped at 19 digits (PAY-29). Non-digit characters
// (spaces, letters) are dropped first.
export const formatCardNumber = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 19);
  const brand = detectBrand(digits);

  if (brand === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }

  return digits.replace(/(.{4})/g, "$1 ").trim();
};

// Credit-card preview number (PAY-32): masks every digit but the last 4,
// or all-mask while fewer than 4 digits have been entered.
export const maskedNumber = (value: string): string => {
  const digits = onlyDigits(value);
  const last4 = digits.length >= 4 ? digits.slice(-4) : "••••";
  return `•••• •••• •••• ${last4}`;
};

// Formats the expiry input as the user types, inserting the "/" after the
// month (PAY-29 style grouping applied to MM/YY).
export const formatExpiryInput = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidNumber = (number: string): boolean => {
  const digits = normalizeNumber(number);
  return /^\d{13,19}$/.test(digits) && luhn(digits);
};

const isValidHolder = (holder: string): boolean => {
  const trimmed = holder.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

const parseExpiry = (
  expiry: string,
): { month: number; year: number } | null => {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  if (month < 1 || month > 12) {
    return null;
  }

  return { month, year: 2000 + Number(match[2]) };
};

const isValidExpiry = (expiry: string, now: Date): boolean => {
  const parsed = parseExpiry(expiry);
  if (!parsed) {
    return false;
  }

  const currentMonthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const expiryMonthIndex = parsed.year * 12 + (parsed.month - 1);

  return expiryMonthIndex >= currentMonthIndex;
};

const isValidCvv = (cvv: string, brand: CardBrand): boolean => {
  const expectedLength = brand === "amex" ? 4 : 3;
  const pattern = new RegExp(`^\\d{${expectedLength}}$`);
  return pattern.test(cvv);
};

export const validateCard = (card: CardInput, now: Date): CardFieldErrors => {
  const brand = detectBrand(card.number);

  return {
    number: isValidNumber(card.number) ? "" : MESSAGES.number,
    holder: isValidHolder(card.holder) ? "" : MESSAGES.holder,
    expiry: isValidExpiry(card.expiry, now) ? "" : MESSAGES.expiry,
    cvv: isValidCvv(card.cvv, brand) ? "" : MESSAGES.cvv,
  };
};
