const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(value) {
  if (typeof value !== "string") {
    return null;
  }

  const phone = value.replace(/[\s().-]/g, "").trim();
  return E164_PHONE_REGEX.test(phone) ? phone : null;
}

export function isValidPhoneNumber(value) {
  return Boolean(normalizePhoneNumber(value));
}
