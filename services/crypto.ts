
import { logger } from './logger';

// Utilities for Local Security using Web Crypto API

const SALT_len = 16;
const IV_len = 12;
const ITERATIONS = 100000;
const ALGO = 'AES-GCM';

const buffToHex = (buff: ArrayBuffer) => {
  return Array.from(new Uint8Array(buff)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hexToBuff = (hex: string) => {
  const tokens = hex.match(/.{1,2}/g);
  if (!tokens) return new Uint8Array();
  return new Uint8Array(tokens.map(t => parseInt(t, 16)));
};

export class CryptoService {
  private key: CryptoKey | null = null;

  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: ALGO, length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async register(password: string): Promise<string> {
    logger.system('Initializing secure vault registration...', 'Crypto');
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_len));
    this.key = await this.deriveKey(password, salt);
    logger.info('Cryptographic key derived successfully', 'Crypto');
    return buffToHex(salt.buffer);
  }

  async login(password: string, saltHex: string): Promise<boolean> {
    try {
      const salt = hexToBuff(saltHex);
      this.key = await this.deriveKey(password, salt);
      logger.system('User authentication successful. Vault unlocked.', 'Crypto');
      return true;
    } catch (e) {
      logger.error('Authentication failed', 'Crypto', e);
      return false;
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key) throw new Error("Vault locked");
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_len));
    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: ALGO, iv: iv },
      this.key,
      enc.encode(data)
    );
    return buffToHex(iv.buffer) + ":" + buffToHex(encrypted);
  }

  async decrypt(cipherText: string): Promise<string> {
    if (!this.key) throw new Error("Vault locked");
    const [ivHex, dataHex] = cipherText.split(':');
    const iv = hexToBuff(ivHex);
    const data = hexToBuff(dataHex);

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: ALGO, iv: iv },
        this.key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      logger.error('Decryption failed. Data corruption or wrong key.', 'Crypto');
      throw e;
    }
  }
  
  isUnlocked() {
      return !!this.key;
  }
}

export const cryptoVault = new CryptoService();
