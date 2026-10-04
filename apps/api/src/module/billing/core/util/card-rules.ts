// Pure card validation rules (PAY-28, PAY-44). No I/O, no logging: the
// caller (BillingService) must never pass a card object to a logger.

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'card';

export interface CardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export type CardFieldErrors = Record<
  'number' | 'holder' | 'expiry' | 'cvv',
  string
>;

const MESSAGES = {
  number: 'Enter a valid card number',
  holder: 'Enter the name on the card',
  expiry: 'Enter a valid expiry date',
  cvv: 'Enter a valid CVV',
} as const;

export const normalizeNumber = (number: string): string =>
  number.replace(/\s+/g, '');

const isLuhnValid = (digits: string): boolean => {
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
    return 'visa';
  }

  const twoDigitPrefix = Number(digits.slice(0, 2));
  const fourDigitPrefix = Number(digits.slice(0, 4));

  if (
    (twoDigitPrefix >= 51 && twoDigitPrefix <= 55) ||
    (fourDigitPrefix >= 2221 && fourDigitPrefix <= 2720)
  ) {
    return 'mastercard';
  }

  if (/^3[47]/.test(digits)) {
    return 'amex';
  }

  return 'card';
};

export const last4 = (number: string): string =>
  normalizeNumber(number).slice(-4);

const isValidNumber = (number: string): boolean => {
  const digits = normalizeNumber(number);
  return /^\d{13,19}$/.test(digits) && isLuhnValid(digits);
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
  const expectedLength = brand === 'amex' ? 4 : 3;
  const pattern = new RegExp(`^\\d{${expectedLength}}$`);
  return pattern.test(cvv);
};

export const validateCard = (card: CardInput, now: Date): CardFieldErrors => {
  const brand = detectBrand(card.number);

  return {
    number: isValidNumber(card.number) ? '' : MESSAGES.number,
    holder: isValidHolder(card.holder) ? '' : MESSAGES.holder,
    expiry: isValidExpiry(card.expiry, now) ? '' : MESSAGES.expiry,
    cvv: isValidCvv(card.cvv, brand) ? '' : MESSAGES.cvv,
  };
};
