import crypto from "node:crypto";

const SHORT_CODE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateShortCode(length = 7) {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += SHORT_CODE_ALPHABET[crypto.randomInt(SHORT_CODE_ALPHABET.length)];
  }

  return code;
}
