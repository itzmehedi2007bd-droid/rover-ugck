
export interface LoginInput {
  email: string;
  password: string;
}

export interface AdminCreateInput extends LoginInput {
  name: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export function isValidEmail(email: string): boolean {
  return email.length <= 255 && EMAIL_REGEX.test(email);
}

export function validateLoginInput(
  input: unknown
): ValidationResult<LoginInput> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      errors: { _form: "অবৈধ ডেটা" },
    };
  }

  const value = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";

  const password =
    typeof value.password === "string" ? value.password : "";

  if (!email) {
    errors.email = "ইমেইল আবশ্যক";
  } else if (!isValidEmail(email)) {
    errors.email = "সঠিক ইমেইল ঠিকানা দিন";
  }

  if (!password) {
    errors.password = "পাসওয়ার্ড আবশ্যক";
  } else if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    errors.password = "পাসওয়ার্ড ৮ থেকে ১২৮ অক্ষরের মধ্যে হতে হবে";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { email, password },
  };
}

export function validateAdminCreateInput(
  input: unknown
): ValidationResult<AdminCreateInput> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      errors: { _form: "অবৈধ ডেটা" },
    };
  }

  const value = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (name.length < 2 || name.length > 100) {
    errors.name = "নাম ২ থেকে ১০০ অক্ষরের মধ্যে হতে হবে";
  }

  const loginResult = validateLoginInput({
    email: value.email,
    password: value.password,
  });

  if (!loginResult.success && loginResult.errors) {
    Object.assign(errors, loginResult.errors);
  }

  if (Object.keys(errors).length > 0 || !loginResult.data) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name,
      email: loginResult.data.email,
      password: loginResult.data.password,
    },
  };
}
