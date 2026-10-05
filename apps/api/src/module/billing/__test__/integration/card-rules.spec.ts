import {
  detectBrand,
  last4,
  normalizeNumber,
  validateCard,
} from '@billingModule/core/util/card-rules';

// Builds a Luhn-valid digit string of exactly `length`, from a repeating
// prefix, by appending a computed check digit.
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

const luhnValidNumber = (length: number, prefix = '4'): string => {
  const base = prefix.padEnd(length - 1, '0');
  const checkDigit = (10 - luhnChecksum(`${base}0`)) % 10;
  return `${base}${checkDigit}`;
};

const VALID_HOLDER = 'Jane Doe';
const VALID_EXPIRY = (now: Date) => {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = String(now.getUTCFullYear() % 100).padStart(2, '0');
  return `${month}/${year}`;
};
const NOW = new Date('2026-06-15T00:00:00.000Z');

const buildCard = (overrides: Partial<Parameters<typeof validateCard>[0]>) => ({
  number: luhnValidNumber(16),
  holder: VALID_HOLDER,
  expiry: VALID_EXPIRY(NOW),
  cvv: '123',
  ...overrides,
});

describe('card-rules', () => {
  describe('number (PAY-44)', () => {
    it('passes a Luhn-valid 13-digit number', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(13) }),
        NOW,
      );
      expect(result.number).toBe('');
    });

    it('passes a Luhn-valid 19-digit number', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(19) }),
        NOW,
      );
      expect(result.number).toBe('');
    });

    it('fails a Luhn-valid 12-digit number (too short)', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(12) }),
        NOW,
      );
      expect(result.number).toBe('Enter a valid card number');
    });

    it('fails a Luhn-valid 20-digit number (too long)', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(20) }),
        NOW,
      );
      expect(result.number).toBe('Enter a valid card number');
    });

    it('fails a Luhn-invalid 16-digit number', () => {
      const valid = luhnValidNumber(16);
      const lastDigit = Number(valid[valid.length - 1]);
      const invalid = `${valid.slice(0, -1)}${(lastDigit + 1) % 10}`;

      const result = validateCard(buildCard({ number: invalid }), NOW);
      expect(result.number).toBe('Enter a valid card number');
    });

    it('ignores spaces in the number', () => {
      const valid = luhnValidNumber(16);
      const spaced = valid.replace(/(.{4})/g, '$1 ').trim();

      const result = validateCard(buildCard({ number: spaced }), NOW);
      expect(result.number).toBe('');
    });
  });

  describe('holder (PAY-44)', () => {
    it('fails a 1-character holder', () => {
      const result = validateCard(buildCard({ holder: 'A' }), NOW);
      expect(result.holder).toBe('Enter the name on the card');
    });

    it('passes a 2-character holder', () => {
      const result = validateCard(buildCard({ holder: 'Al' }), NOW);
      expect(result.holder).toBe('');
    });

    it('passes a 50-character holder', () => {
      const result = validateCard(buildCard({ holder: 'A'.repeat(50) }), NOW);
      expect(result.holder).toBe('');
    });

    it('fails a 51-character holder', () => {
      const result = validateCard(buildCard({ holder: 'A'.repeat(51) }), NOW);
      expect(result.holder).toBe('Enter the name on the card');
    });

    it('fails a whitespace-only holder', () => {
      const result = validateCard(buildCard({ holder: '   ' }), NOW);
      expect(result.holder).toBe('Enter the name on the card');
    });
  });

  describe('expiry (PAY-44)', () => {
    it('fails month 13', () => {
      const result = validateCard(buildCard({ expiry: '13/30' }), NOW);
      expect(result.expiry).toBe('Enter a valid expiry date');
    });

    it('fails month 00', () => {
      const result = validateCard(buildCard({ expiry: '00/30' }), NOW);
      expect(result.expiry).toBe('Enter a valid expiry date');
    });

    it('fails last month', () => {
      const result = validateCard(buildCard({ expiry: '05/26' }), NOW);
      expect(result.expiry).toBe('Enter a valid expiry date');
    });

    it('passes the current month', () => {
      const result = validateCard(buildCard({ expiry: '06/26' }), NOW);
      expect(result.expiry).toBe('');
    });

    it('fails a single-digit month format (1/30)', () => {
      const result = validateCard(buildCard({ expiry: '1/30' }), NOW);
      expect(result.expiry).toBe('Enter a valid expiry date');
    });

    it('fails a no-slash format (0830)', () => {
      const result = validateCard(buildCard({ expiry: '0830' }), NOW);
      expect(result.expiry).toBe('Enter a valid expiry date');
    });
  });

  describe('cvv (PAY-44)', () => {
    const visaNumber = luhnValidNumber(16, '4');
    const amexNumber = luhnValidNumber(15, '34');

    it('passes 3 digits for a Visa number', () => {
      const result = validateCard(
        buildCard({ number: visaNumber, cvv: '123' }),
        NOW,
      );
      expect(result.cvv).toBe('');
    });

    it('fails 4 digits for a Visa number', () => {
      const result = validateCard(
        buildCard({ number: visaNumber, cvv: '1234' }),
        NOW,
      );
      expect(result.cvv).toBe('Enter a valid CVV');
    });

    it('passes 4 digits for an Amex number', () => {
      const result = validateCard(
        buildCard({ number: amexNumber, cvv: '1234' }),
        NOW,
      );
      expect(result.cvv).toBe('');
    });

    it('fails 3 digits for an Amex number', () => {
      const result = validateCard(
        buildCard({ number: amexNumber, cvv: '123' }),
        NOW,
      );
      expect(result.cvv).toBe('Enter a valid CVV');
    });

    it.each(['51', '2221'])(
      'passes 3 digits for a Mastercard number starting with %s',
      (prefix) => {
        const result = validateCard(
          buildCard({ number: luhnValidNumber(16, prefix), cvv: '123' }),
          NOW,
        );
        expect(result.cvv).toBe('');
      },
    );

    it('fails 4 digits for a Mastercard number', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(16, '51'), cvv: '1234' }),
        NOW,
      );
      expect(result.cvv).toBe('Enter a valid CVV');
    });

    it('passes 3 digits for a generic card number', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(16, '6011'), cvv: '123' }),
        NOW,
      );
      expect(result.cvv).toBe('');
    });

    it('fails 4 digits for a generic card number', () => {
      const result = validateCard(
        buildCard({ number: luhnValidNumber(16, '6011'), cvv: '1234' }),
        NOW,
      );
      expect(result.cvv).toBe('Enter a valid CVV');
    });
  });

  describe('detectBrand', () => {
    it('detects visa for a number starting with 4', () => {
      expect(detectBrand('4242424242424242')).toBe('visa');
    });

    it('detects mastercard for a 2-digit prefix of 51', () => {
      expect(detectBrand('5100000000000000')).toBe('mastercard');
    });

    it('detects mastercard for a 2-digit prefix of 55', () => {
      expect(detectBrand('5500000000000000')).toBe('mastercard');
    });

    it('detects mastercard for a 4-digit prefix of 2221', () => {
      expect(detectBrand('2221000000000000')).toBe('mastercard');
    });

    it('detects mastercard for a 4-digit prefix of 2720', () => {
      expect(detectBrand('2720000000000000')).toBe('mastercard');
    });

    it('detects card (not mastercard) for a 4-digit prefix of 2721', () => {
      expect(detectBrand('2721000000000000')).toBe('card');
    });

    it.each([
      ['50', 'card'],
      ['51', 'mastercard'],
      ['55', 'mastercard'],
      ['56', 'card'],
      ['2220', 'card'],
      ['2221', 'mastercard'],
      ['2720', 'mastercard'],
      ['2721', 'card'],
    ])(
      'detects %s on the mastercard range edge as %s (PAY-32)',
      (prefix, brand) => {
        const number = luhnValidNumber(16, prefix);

        expect(validateCard(buildCard({ number }), NOW).number).toBe('');
        expect(detectBrand(number)).toBe(brand);
      },
    );

    it('detects amex for a prefix of 34', () => {
      expect(detectBrand('340000000000000')).toBe('amex');
    });

    it('detects amex for a prefix of 37', () => {
      expect(detectBrand('370000000000000')).toBe('amex');
    });

    it('detects card for a prefix of 6011', () => {
      expect(detectBrand('6011000000000000')).toBe('card');
    });
  });

  describe('field keys', () => {
    it('returns exactly the keys number, holder, expiry and cvv', () => {
      const result = validateCard(buildCard({}), NOW);
      expect(Object.keys(result).sort()).toEqual([
        'cvv',
        'expiry',
        'holder',
        'number',
      ]);
    });

    it('uses the PAY-28 messages for every invalid field', () => {
      const result = validateCard(
        {
          number: '1',
          holder: '',
          expiry: 'bad',
          cvv: 'bad',
        },
        NOW,
      );
      expect(result).toEqual({
        number: 'Enter a valid card number',
        holder: 'Enter the name on the card',
        expiry: 'Enter a valid expiry date',
        cvv: 'Enter a valid CVV',
      });
    });
  });

  describe('normalizeNumber / last4', () => {
    it('strips spaces', () => {
      expect(normalizeNumber('4242 4242 4242 4242')).toBe('4242424242424242');
    });

    it('returns the last 4 digits, ignoring spaces', () => {
      expect(last4('4242 4242 4242 4242')).toBe('4242');
    });
  });
});
