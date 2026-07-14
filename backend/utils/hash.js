import crypto from "node:crypto";

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

export function sha256(value, salt = process.env.HASH_SALT ?? "") {
  return crypto.createHash("sha256").update(`${salt}${value}`).digest("hex");
}

export function hashIpAddress(ipAddress) {
  if (!ipAddress) {
    return undefined;
  }

  return sha256(ipAddress);
}

export function hashToken(token) {
  return sha256(token);
}

export function isSha256Hash(value) {
  return typeof value === "string" && SHA256_HEX_REGEX.test(value);
}
