import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be set and at least 32 characters");
  }
  // Use SHA-256 to derive a consistent 32-byte key
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv + tag + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  // Encrypted values are base64 and significantly longer than raw text
  // A valid encrypted value has at least IV (12) + tag (16) + 1 byte = 29 bytes
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1 && value === buf.toString("base64");
  } catch {
    return false;
  }
}

export function encryptionAvailable(): boolean {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  return !!key && key.length >= 32;
}
