import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for BYO API keys.
 *
 * The master key lives ONLY in the ENCRYPTION_MASTER_KEY env var (32 bytes,
 * base64), never in the database. Ciphertext, IV, and auth tag are stored
 * separately (base64). Plaintext keys exist only in server memory during a
 * single request and never reach the browser or logs.
 *
 * Generate a master key once with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length

export type EncryptedSecret = {
  enc: string; // base64 ciphertext
  iv: string; // base64 nonce
  tag: string; // base64 auth tag
};

function getMasterKey(): Buffer {
  const b64 = process.env.ENCRYPTION_MASTER_KEY;
  if (!b64) {
    throw new Error("ENCRYPTION_MASTER_KEY is not set");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must decode to 32 bytes (base64-encoded 256-bit key)",
    );
  }
  return key;
}

/** True when a valid master key is configured (used to gate the keys UI). */
export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret({ enc, iv, tag }: EncryptedSecret): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(enc, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Last 4 chars of a secret, for the masked ••••last4 hint. */
export function last4(secret: string): string {
  return secret.trim().slice(-4);
}
