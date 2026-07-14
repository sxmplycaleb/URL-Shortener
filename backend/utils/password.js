import bcrypt from "bcryptjs";

const DEFAULT_BCRYPT_SALT_ROUNDS = 12;

function getSaltRounds() {
  const configuredRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? DEFAULT_BCRYPT_SALT_ROUNDS);

  if (!Number.isInteger(configuredRounds) || configuredRounds < 4) {
    throw new Error("BCRYPT_SALT_ROUNDS must be an integer greater than or equal to 4.");
  }

  return configuredRounds;
}

export function hashPassword(password) {
  return bcrypt.hash(password, getSaltRounds());
}

export function comparePassword(candidatePassword, passwordHash) {
  return bcrypt.compare(candidatePassword, passwordHash);
}
