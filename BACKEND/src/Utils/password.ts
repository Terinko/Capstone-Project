import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // Higher = slower = more secure. 12 is a good balance.

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
