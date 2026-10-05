import { describe, expect, it } from "vitest";
import {
  emailSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/features/auth/utils/auth-schemas";

function firstMessage(result: { error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

const validSignUp = {
  firstName: "Negar",
  lastName: "Khosravi",
  email: "negar@example.com",
  password: "a-strong-password",
};

// A valid email of exactly `length` characters, built from a local part and
// a fixed domain, so AUTH-08's 254/255 boundary can be tested precisely.
function emailOfLength(length: number) {
  const domain = "@example.com";
  return "a".repeat(length - domain.length) + domain;
}

describe("signUpSchema (AUTH-06, AUTH-07, AUTH-08, AUTH-09)", () => {
  it("accepts valid values", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("rejects an empty first name with 'Enter your name.'", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, firstName: "  " });
    expect(firstMessage(result)).toBe("Enter your name.");
  });

  it("accepts a first name at exactly 50 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      firstName: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a first name at 51 characters with 'Must be 50 characters or fewer.'", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      firstName: "a".repeat(51),
    });
    expect(firstMessage(result)).toBe("Must be 50 characters or fewer.");
  });

  it("rejects an empty last name with 'Enter your last name.'", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, lastName: "  " });
    expect(firstMessage(result)).toBe("Enter your last name.");
  });

  it("accepts a last name at exactly 50 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      lastName: "b".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a last name at 51 characters with 'Must be 50 characters or fewer.'", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      lastName: "b".repeat(51),
    });
    expect(firstMessage(result)).toBe("Must be 50 characters or fewer.");
  });

  it("trims and lowercases the email", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      email: "  Negar@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("negar@example.com");
  });

  it("rejects an invalid email with 'Enter a valid email address.'", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      email: "not-an-email",
    });
    expect(firstMessage(result)).toBe("Enter a valid email address.");
  });

  it("accepts an email at exactly 254 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      email: emailOfLength(254),
    });
    expect(result.success).toBe(true);
  });

  it("rejects an email at 255 characters with 'Enter a valid email address.'", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      email: emailOfLength(255),
    });
    expect(firstMessage(result)).toBe("Enter a valid email address.");
  });

  it("rejects a password at 7 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: "a".repeat(7),
    });
    expect(firstMessage(result)).toBe(
      "Password must be between 8 and 72 characters.",
    );
  });

  it("accepts a password at exactly 8 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: "a".repeat(8),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a password at exactly 72 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: "a".repeat(72),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password at 73 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: "a".repeat(73),
    });
    expect(firstMessage(result)).toBe(
      "Password must be between 8 and 72 characters.",
    );
  });
});

describe("logInSchema (AUTH-37)", () => {
  it("accepts valid values", () => {
    const result = logInSchema.safeParse({
      email: "negar@example.com",
      password: "whatever",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email with 'Enter a valid email address.'", () => {
    const result = logInSchema.safeParse({ email: "", password: "x" });
    expect(firstMessage(result)).toBe("Enter a valid email address.");
  });

  it("rejects an invalid email with 'Enter a valid email address.'", () => {
    const result = logInSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });
    expect(firstMessage(result)).toBe("Enter a valid email address.");
  });

  it("rejects an empty password with 'Enter your password.'", () => {
    const result = logInSchema.safeParse({
      email: "negar@example.com",
      password: "",
    });
    expect(firstMessage(result)).toBe("Enter your password.");
  });
});

describe("emailSchema", () => {
  it("trims and lowercases the email", () => {
    const result = emailSchema.safeParse({ email: "  Zoe@EXAMPLE.com  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("zoe@example.com");
  });

  it("rejects an invalid email with 'Enter a valid email address.'", () => {
    const result = emailSchema.safeParse({ email: "not-an-email" });
    expect(firstMessage(result)).toBe("Enter a valid email address.");
  });
});

describe("resetPasswordSchema (AUTH-62, AUTH-63)", () => {
  it("accepts matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "a-strong-password",
      confirmPassword: "a-strong-password",
    });
    expect(result.success).toBe(true);
  });

  it("puts 'Passwords don't match.' on confirmPassword when they differ", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "a-strong-password",
      confirmPassword: "a-different-password",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords don't match.");
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a new password at 7 characters with the password length message", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "a".repeat(7),
      confirmPassword: "a".repeat(7),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("newPassword"),
      );
      expect(issue?.message).toBe(
        "Password must be between 8 and 72 characters.",
      );
    }
  });

  it("rejects a new password at 73 characters with the password length message", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "a".repeat(73),
      confirmPassword: "a".repeat(73),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("newPassword"),
      );
      expect(issue?.message).toBe(
        "Password must be between 8 and 72 characters.",
      );
    }
  });
});
