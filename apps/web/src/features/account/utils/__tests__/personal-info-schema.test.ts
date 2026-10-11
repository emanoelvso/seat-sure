import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PHONE_COUNTRY_CODES,
  formatBirthDate,
  personalInfoSchema,
  todayInAppTimeZone,
  toFormValues,
} from "@/features/account/utils/personal-info-schema";

const valid = {
  firstName: "Negar",
  lastName: "Khosravi",
  state: "",
  city: "",
  birthDate: "",
  phoneCountryCode: "+1",
  phoneNumber: "",
  zipCode: "",
};

function errorsOf(overrides: Partial<typeof valid>) {
  const result = personalInfoSchema.safeParse({ ...valid, ...overrides });
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[String(issue.path[0])] ??= issue.message;
  }
  return errors;
}

function parsed(overrides: Partial<typeof valid>) {
  const result = personalInfoSchema.safeParse({ ...valid, ...overrides });
  if (!result.success) throw new Error("expected valid input");
  return result.data;
}

describe("personalInfoSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("accepts a profile with only the required names", () => {
    expect(personalInfoSchema.safeParse(valid).success).toBe(true);
  });

  describe("names (PROFILE-04)", () => {
    it("trims and rejects empty names with the sign-up messages", () => {
      expect(errorsOf({ firstName: "   ", lastName: "" })).toEqual({
        firstName: "Enter your name.",
        lastName: "Enter your last name.",
      });
    });

    it("accepts 50 characters and rejects 51", () => {
      expect(errorsOf({ firstName: "a".repeat(50) })).toBeNull();
      expect(errorsOf({ firstName: "a".repeat(51) })).toEqual({
        firstName: "Must be 50 characters or fewer.",
      });
      expect(errorsOf({ lastName: "b".repeat(51) })).toEqual({
        lastName: "Must be 50 characters or fewer.",
      });
    });

    it("measures the length after trimming", () => {
      expect(parsed({ firstName: ` ${"a".repeat(50)} ` }).firstName).toBe(
        "a".repeat(50),
      );
    });
  });

  describe("state and city", () => {
    it("accepts 50 characters and rejects 51", () => {
      expect(errorsOf({ state: "s".repeat(50), city: "c".repeat(50) })).toBeNull();
      expect(errorsOf({ state: "s".repeat(51), city: "c".repeat(51) })).toEqual({
        state: "Must be 50 characters or fewer.",
        city: "Must be 50 characters or fewer.",
      });
    });

    it("trims them and keeps empty as empty", () => {
      const data = parsed({ state: "  Texas ", city: "   " });
      expect(data.state).toBe("Texas");
      expect(data.city).toBe("");
    });
  });

  describe("zip code", () => {
    it.each(["12", "12345678901"])("rejects %s", (zipCode) => {
      expect(errorsOf({ zipCode })).toEqual({
        zipCode: "Enter a valid zip code.",
      });
    });

    it.each(["123", "1234567890", "SW1A 1AA", "28013-000", "  75001  "])(
      "accepts %s",
      (zipCode) => {
        expect(errorsOf({ zipCode })).toBeNull();
      },
    );

    it("rejects characters outside letters, digits, spaces and hyphens", () => {
      expect(errorsOf({ zipCode: "12#45" })).toEqual({
        zipCode: "Enter a valid zip code.",
      });
    });

    it("allows an empty zip code", () => {
      expect(parsed({ zipCode: "" }).zipCode).toBe("");
    });
  });

  describe("phone", () => {
    it("strips spaces and hyphens from the number", () => {
      expect(parsed({ phoneNumber: "5588 554 88" }).phoneNumber).toBe(
        "558855488",
      );
      expect(parsed({ phoneNumber: "55-88-554" }).phoneNumber).toBe("5588554");
    });

    it("rejects 3 and 15 digits and accepts 4 and 14", () => {
      const message = { phone: "Enter a valid phone number." };
      expect(errorsOf({ phoneNumber: "123" })).toEqual(message);
      expect(errorsOf({ phoneNumber: "1".repeat(15) })).toEqual(message);
      expect(errorsOf({ phoneNumber: "1234" })).toBeNull();
      expect(errorsOf({ phoneNumber: "1".repeat(14) })).toBeNull();
    });

    it("rejects letters", () => {
      expect(errorsOf({ phoneNumber: "55a8554" })).toEqual({
        phone: "Enter a valid phone number.",
      });
    });

    it("rejects a country code outside the list when a number is given", () => {
      expect(errorsOf({ phoneCountryCode: "+7", phoneNumber: "55885" })).toEqual(
        { phone: "Enter a valid phone number." },
      );
    });

    it("accepts every listed code", () => {
      for (const { code } of PHONE_COUNTRY_CODES) {
        expect(
          errorsOf({ phoneCountryCode: code, phoneNumber: "55885" }),
        ).toBeNull();
      }
    });

    it("ignores the code when the number is empty", () => {
      const data = parsed({ phoneCountryCode: "+7", phoneNumber: "  " });
      expect(data.phoneNumber).toBe("");
    });
  });

  describe("birth date", () => {
    const message = { birthDate: "Enter a valid date of birth." };

    it("accepts 1900-01-01 and today, rejects the day before 1900 and tomorrow", () => {
      expect(errorsOf({ birthDate: "1900-01-01" })).toBeNull();
      expect(errorsOf({ birthDate: "2026-10-06" })).toBeNull();
      expect(errorsOf({ birthDate: "1899-12-31" })).toEqual(message);
      expect(errorsOf({ birthDate: "2026-10-07" })).toEqual(message);
    });

    it.each(["2024-02-30", "17/08/1995", "1995-8-17", "abc"])(
      "rejects the malformed date %s",
      (birthDate) => {
        expect(errorsOf({ birthDate })).toEqual(message);
      },
    );

    it("takes today in the app time zone", () => {
      vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "Pacific/Auckland");
      vi.setSystemTime(new Date("2026-10-06T23:30:00Z"));
      // 2026-10-07 in Auckland, still 2026-10-06 in UTC.
      expect(errorsOf({ birthDate: "2026-10-07" })).toBeNull();
      expect(errorsOf({ birthDate: "2026-10-08" })).toEqual(message);
    });

    it("allows an empty date", () => {
      expect(parsed({ birthDate: "" }).birthDate).toBe("");
    });
  });

  it("returns every invalid field at once", () => {
    expect(
      errorsOf({
        firstName: "",
        lastName: "",
        zipCode: "1",
        phoneNumber: "1",
        birthDate: "1800-01-01",
      }),
    ).toEqual({
      firstName: "Enter your name.",
      lastName: "Enter your last name.",
      zipCode: "Enter a valid zip code.",
      phone: "Enter a valid phone number.",
      birthDate: "Enter a valid date of birth.",
    });
  });
});

describe("PHONE_COUNTRY_CODES", () => {
  it("lists +1, +49, +34, +33 in that order", () => {
    expect(PHONE_COUNTRY_CODES.map(({ code }) => code)).toEqual([
      "+1",
      "+49",
      "+34",
      "+33",
    ]);
  });
});

describe("toFormValues", () => {
  it("maps null optional fields to empty strings and a missing phone to +1", () => {
    expect(
      toFormValues({
        firstName: "Negar",
        lastName: "Khosravi",
        state: null,
        city: null,
        birthDate: null,
        phoneCountryCode: null,
        phoneNumber: null,
        zipCode: null,
      }),
    ).toEqual({
      firstName: "Negar",
      lastName: "Khosravi",
      state: "",
      city: "",
      birthDate: "",
      phoneCountryCode: "+1",
      phoneNumber: "",
      zipCode: "",
    });
  });

  it("keeps every saved value", () => {
    const profile = {
      firstName: "Sara",
      lastName: "Lopez",
      state: "Madrid",
      city: "Madrid",
      birthDate: "1995-08-17",
      phoneCountryCode: "+34",
      phoneNumber: "558855488",
      zipCode: "28013",
    };
    expect(toFormValues(profile)).toEqual(profile);
  });
});

describe("formatBirthDate", () => {
  it("formats an ISO date as MM/DD/YYYY", () => {
    expect(formatBirthDate("1995-08-17")).toBe("08/17/1995");
  });

  it("returns an empty string for an empty value", () => {
    expect(formatBirthDate("")).toBe("");
  });
});

// BDATE-04: the calendar and the schema share this app-time-zone date.
describe("todayInAppTimeZone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("is a day ahead of UTC in Pacific/Kiritimati (UTC+14)", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "Pacific/Kiritimati");
    vi.setSystemTime(new Date("2023-08-30T10:30:00Z"));

    expect(todayInAppTimeZone()).toBe("2023-08-31");
  });

  it("is a day behind UTC in Pacific/Niue (UTC-11)", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "Pacific/Niue");
    vi.setSystemTime(new Date("2023-08-30T10:30:00Z"));

    expect(todayInAppTimeZone()).toBe("2023-08-29");
  });

  it("rolls over at UTC midnight when the zone is UTC", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");
    vi.setSystemTime(new Date("2023-08-30T23:59:59Z"));
    expect(todayInAppTimeZone()).toBe("2023-08-30");

    vi.setSystemTime(new Date("2023-08-31T00:00:00Z"));
    expect(todayInAppTimeZone()).toBe("2023-08-31");
  });
});
