/**
 * AES-256-GCM encryption for storing user API keys
 * 
 * Keys are encrypted before writing to the database and
 * decrypted only when needed for LLM API calls.
 * 
 * The encryption key is derived from ENCRYPTION_SECRET env var.
 * If not set, falls back to a deterministic key derived from DATABASE_URL
 * (acceptable for development, NOT for production).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = "agenthaus-api-key-salt"; // Static salt for key derivation

/**
 * Derive a 32-byte encryption key from the secret
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.DATABASE_URL ||
    "agenthaus-dev-fallback-key-change-in-production";

  return scryptSync(secret, SALT, 32);
}

/**
 * Encrypt a plaintext string (e.g. API key)
 * Returns a hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string back to plaintext
 * Expects format: iv:authTag:ciphertext (all hex)
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask an API key for display (e.g. "sk-or-v1-abc...xyz")
 * Shows first 10 and last 4 characters
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 16) return "••••••••";
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

