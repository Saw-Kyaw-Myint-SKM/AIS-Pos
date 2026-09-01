import * as Crypto from 'expo-crypto';
import type { LocalAccountCredential, LocalAccountWrite } from './db';

/**
 * Fast local-only password verifier selected for this POS. Passwords are never
 * stored in SQLite; only SHA-256(password bytes + per-account random salt)
 * and the random salt are persisted.
 */
export const PASSWORD_ALGORITHM = 'sha256-salted-v1';
export const PASSWORD_ITERATIONS = 1;

async function randomBytes(length: number): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(length);
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return globalThis.btoa(binary);
}

function base64Decode(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8;
  const paddedLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667; let h1 = 0xbb67ae85; let h2 = 0x3c6ef372; let h3 = 0xa54ff53a;
  let h4 = 0x510e527f; let h5 = 0x9b05688c; let h6 = 0x1f83d9ab; let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const a = w[i - 15]; const b = w[i - 2];
      const s0 = rotateRight(a, 7) ^ rotateRight(a, 18) ^ (a >>> 3);
      const s1 = rotateRight(b, 17) ^ rotateRight(b, 19) ^ (b >>> 10);
      w[i] = (((w[i - 16] + s0) >>> 0) + ((w[i - 7] + s1) >>> 0)) >>> 0;
    }
    let a = h0; let b = h1; let c = h2; let d = h3; let e = h4; let f = h5; let g = h6; let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const t1 = (((((h + S1) >>> 0) + choice) >>> 0) + ((SHA256_K[i] + w[i]) >>> 0)) >>> 0;
      const S0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((word, index) => resultView.setUint32(index * 4, word, false));
  return result;
}

function passwordHash(password: string, salt: Uint8Array): Uint8Array {
  // The length prefix keeps the input unambiguous when password/salt values
  // are concatenated before the one selected SHA-256 operation.
  const passwordBytes = utf8(password.normalize('NFKC'));
  const input = new Uint8Array(4 + passwordBytes.length + salt.length);
  new DataView(input.buffer).setUint32(0, passwordBytes.length, false);
  input.set(passwordBytes, 4);
  input.set(salt, 4 + passwordBytes.length);
  return sha256(input);
}

function fixedTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function createPasswordVerifier(password: string): Promise<Pick<LocalAccountWrite,
  'passwordHash' | 'passwordSalt' | 'passwordAlgorithm' | 'passwordIterations'>> {
  const salt = await randomBytes(16);
  const verifier = passwordHash(password, salt);
  return {
    passwordHash: base64Encode(verifier),
    passwordSalt: base64Encode(salt),
    passwordAlgorithm: PASSWORD_ALGORITHM,
    passwordIterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password: string, account: LocalAccountCredential): Promise<boolean> {
  if (account.passwordAlgorithm !== PASSWORD_ALGORITHM || account.passwordIterations !== PASSWORD_ITERATIONS) return false;
  const verifier = passwordHash(password, base64Decode(account.passwordSalt));
  return fixedTimeEqual(verifier, base64Decode(account.passwordHash));
}

export async function createSessionToken(): Promise<string> {
  return base64Encode(await randomBytes(32));
}
