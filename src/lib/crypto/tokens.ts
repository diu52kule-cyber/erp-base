import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    // Return a deterministic fallback so the app doesn't crash when not configured.
    // Tokens are still stored but without strong encryption — log a warning.
    if (process.env.NODE_ENV === 'production') {
      console.warn('[crypto] BACKUP_ENCRYPTION_KEY not set — OAuth tokens stored without encryption');
    }
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(hex.slice(0, 64), 'hex');
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // not encrypted — return as-is (backward compat)
  const [ivHex, encHex, tagHex] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8');
}
