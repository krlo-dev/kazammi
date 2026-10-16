import bcrypt from "bcryptjs";

/** bcrypt cost factor: 2^12 rounds, ~250 ms per hash on a typical server (AUTH-R3). */
export const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword({ hash, password }: { hash: string; password: string }) {
  return bcrypt.compare(password, hash);
}
