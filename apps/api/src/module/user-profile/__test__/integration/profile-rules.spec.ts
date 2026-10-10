import {
  PHONE_COUNTRY_CODES,
  UpdateProfileInput,
  validateProfileUpdate,
} from '@userProfileModule/core/model/profile-rules.model';

const TODAY = '2031-03-15';

const valid: UpdateProfileInput = {
  firstName: 'Sara',
  lastName: 'Ahmadi',
  state: 'California',
  city: 'San Francisco',
  birthDate: '1995-08-17',
  phoneCountryCode: '+49',
  phoneNumber: '558855488',
  zipCode: '94105',
};

const validate = (overrides: Partial<UpdateProfileInput>) =>
  validateProfileUpdate({ ...valid, ...overrides }, TODAY);

describe('validateProfileUpdate', () => {
  it('lists the four phone country codes in order', () => {
    expect([...PHONE_COUNTRY_CODES]).toEqual(['+1', '+49', '+34', '+33']);
  });

  it('returns the normalized value for valid input', () => {
    expect(validateProfileUpdate(valid, TODAY)).toEqual({ value: valid });
  });

  describe('names', () => {
    it('trims the names', () => {
      const result = validate({ firstName: '  Sara ', lastName: ' Ahmadi  ' });

      expect(result.value).toMatchObject({
        firstName: 'Sara',
        lastName: 'Ahmadi',
      });
    });

    it('requires a first name', () => {
      expect(validate({ firstName: '   ' }).fields).toEqual({
        firstName: 'Enter your name.',
      });
      expect(validate({ firstName: '' }).fields).toEqual({
        firstName: 'Enter your name.',
      });
    });

    it('requires a last name', () => {
      expect(validate({ lastName: '   ' }).fields).toEqual({
        lastName: 'Enter your last name.',
      });
    });

    it('rejects 51 characters and accepts 50', () => {
      expect(validate({ firstName: 'a'.repeat(51) }).fields).toEqual({
        firstName: 'Must be 50 characters or fewer.',
      });
      expect(validate({ lastName: 'a'.repeat(51) }).fields).toEqual({
        lastName: 'Must be 50 characters or fewer.',
      });
      expect(validate({ firstName: 'a'.repeat(50) }).fields).toBeUndefined();
      expect(validate({ lastName: 'a'.repeat(50) }).fields).toBeUndefined();
    });

    it('measures the length after trimming', () => {
      expect(
        validate({ firstName: ` ${'a'.repeat(50)} ` }).fields,
      ).toBeUndefined();
    });
  });

  describe('state and city', () => {
    it('trims them and rejects 51 characters', () => {
      expect(
        validate({ state: '  Ohio ', city: ' Lima ' }).value,
      ).toMatchObject({ state: 'Ohio', city: 'Lima' });
      expect(
        validate({ state: 'a'.repeat(51), city: 'b'.repeat(51) }).fields,
      ).toEqual({
        state: 'Must be 50 characters or fewer.',
        city: 'Must be 50 characters or fewer.',
      });
    });

    it('accepts 50 characters', () => {
      expect(
        validate({ state: 'a'.repeat(50), city: 'b'.repeat(50) }).fields,
      ).toBeUndefined();
    });

    it('stores null when empty or blank', () => {
      expect(validate({ state: '', city: '   ' }).value).toMatchObject({
        state: null,
        city: null,
      });
    });
  });

  describe('zip code', () => {
    it.each(['123', '1234567890', 'SW1A 1AA', '28013-000'])(
      'accepts %s',
      (zipCode) => {
        expect(validate({ zipCode }).value?.zipCode).toBe(zipCode);
      },
    );

    it.each(['12', '12345678901', '12_45', '123#5', 'ab.cd'])(
      'rejects %s',
      (zipCode) => {
        expect(validate({ zipCode }).fields).toEqual({
          zipCode: 'Enter a valid zip code.',
        });
      },
    );

    it('trims it and stores null when empty', () => {
      expect(validate({ zipCode: ' 94105 ' }).value?.zipCode).toBe('94105');
      expect(validate({ zipCode: '' }).value?.zipCode).toBeNull();
    });
  });

  describe('phone', () => {
    it('strips spaces and hyphens', () => {
      expect(validate({ phoneNumber: '5588 554 88' }).value).toMatchObject({
        phoneCountryCode: '+49',
        phoneNumber: '558855488',
      });
      expect(validate({ phoneNumber: '5588-554-88' }).value).toMatchObject({
        phoneNumber: '558855488',
      });
    });

    it('accepts 4 and 14 digits', () => {
      expect(validate({ phoneNumber: '1234' }).fields).toBeUndefined();
      expect(validate({ phoneNumber: '1'.repeat(14) }).fields).toBeUndefined();
    });

    it('rejects 3 and 15 digits', () => {
      expect(validate({ phoneNumber: '123' }).fields).toEqual({
        phone: 'Enter a valid phone number.',
      });
      expect(validate({ phoneNumber: '1'.repeat(15) }).fields).toEqual({
        phone: 'Enter a valid phone number.',
      });
    });

    it('counts digits after stripping separators', () => {
      expect(validate({ phoneNumber: '1 2-3' }).fields).toEqual({
        phone: 'Enter a valid phone number.',
      });
    });

    it('rejects letters and other characters', () => {
      for (const phoneNumber of ['55885a488', '+5588554', '(558)85548']) {
        expect(validate({ phoneNumber }).fields).toEqual({
          phone: 'Enter a valid phone number.',
        });
      }
    });

    it.each(PHONE_COUNTRY_CODES)('accepts the code %s', (phoneCountryCode) => {
      expect(validate({ phoneCountryCode }).value?.phoneCountryCode).toBe(
        phoneCountryCode,
      );
    });

    it.each(['+7', '49', '', '+1 '])(
      'rejects the code "%s" when a number is given',
      (phoneCountryCode) => {
        expect(validate({ phoneCountryCode }).fields).toEqual({
          phone: 'Enter a valid phone number.',
        });
      },
    );

    it('stores neither code nor number when the number is empty, whatever the code', () => {
      for (const phoneCountryCode of ['+1', '+49', '+7', '']) {
        expect(
          validate({ phoneNumber: '', phoneCountryCode }).value,
        ).toMatchObject({ phoneCountryCode: null, phoneNumber: null });
      }
    });

    it('treats a number of only spaces and hyphens as empty', () => {
      expect(validate({ phoneNumber: ' - ' }).value).toMatchObject({
        phoneCountryCode: null,
        phoneNumber: null,
      });
    });
  });

  describe('birth date', () => {
    it('accepts 1900-01-01 and today', () => {
      expect(validate({ birthDate: '1900-01-01' }).value?.birthDate).toBe(
        '1900-01-01',
      );
      expect(validate({ birthDate: TODAY }).value?.birthDate).toBe(TODAY);
    });

    it('rejects the day before 1900-01-01 and tomorrow', () => {
      expect(validate({ birthDate: '1899-12-31' }).fields).toEqual({
        birthDate: 'Enter a valid date of birth.',
      });
      expect(validate({ birthDate: '2031-03-16' }).fields).toEqual({
        birthDate: 'Enter a valid date of birth.',
      });
    });

    it.each([
      '2024-02-30',
      '2023-02-29',
      '17/08/1995',
      '1995-8-17',
      '1995-13-01',
      'not a date',
      '1995-08-17T00:00:00Z',
    ])('rejects the malformed date %s', (birthDate) => {
      expect(validate({ birthDate }).fields).toEqual({
        birthDate: 'Enter a valid date of birth.',
      });
    });

    it('accepts a leap day', () => {
      expect(validate({ birthDate: '2024-02-29' }).fields).toBeUndefined();
    });

    it('stores null when empty', () => {
      expect(validate({ birthDate: '' }).value?.birthDate).toBeNull();
    });

    it('uses the given today as the upper bound', () => {
      expect(
        validateProfileUpdate(
          { ...valid, birthDate: '2031-03-16' },
          '2031-03-16',
        ).fields,
      ).toBeUndefined();
    });
  });

  it('returns every message at once and no value', () => {
    const result = validate({
      firstName: '',
      lastName: 'a'.repeat(51),
      state: 'a'.repeat(51),
      city: 'b'.repeat(51),
      zipCode: '1',
      phoneNumber: '12',
      birthDate: '1800-01-01',
    });

    expect(result.value).toBeUndefined();
    expect(result.fields).toEqual({
      firstName: 'Enter your name.',
      lastName: 'Must be 50 characters or fewer.',
      state: 'Must be 50 characters or fewer.',
      city: 'Must be 50 characters or fewer.',
      zipCode: 'Enter a valid zip code.',
      phone: 'Enter a valid phone number.',
      birthDate: 'Enter a valid date of birth.',
    });
  });

  it('accepts all optional fields empty', () => {
    expect(
      validate({
        state: '',
        city: '',
        birthDate: '',
        phoneCountryCode: '+1',
        phoneNumber: '',
        zipCode: '',
      }).value,
    ).toEqual({
      firstName: 'Sara',
      lastName: 'Ahmadi',
      state: null,
      city: null,
      birthDate: null,
      phoneCountryCode: null,
      phoneNumber: null,
      zipCode: null,
    });
  });
});
