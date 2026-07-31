// src/lib/tokenStore.ts
// Reads and writes OAuth tokens to ~/.cluco/tokens.json (local machine only)

import path from 'path';
import os from 'os';
import fs from 'fs';

export const VAULT_DIR = path.join(os.homedir(), '.cluco');
export const TOKEN_FILE = path.join(VAULT_DIR, 'tokens.json');

export type ProviderToken = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  connected_at: string;
  email?: string;
  scope?: string;
};

export type TokenStore = Record<string, ProviderToken>;

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

function getTokenFile(userId: string) {
  return path.join(VAULT_DIR, `${userId}_tokens.json`);
}

export function readTokens(userId: string): TokenStore {
  if (!userId) return {};
  try {
    ensureVaultDir();
    const file = getTokenFile(userId);
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as TokenStore;
  } catch {
    return {};
  }
}

export function getToken(userId: string, provider: string): ProviderToken | null {
  if (!userId) return null;
  const tokens = readTokens(userId);
  return tokens[provider] ?? null;
}

export function writeToken(userId: string, provider: string, token: ProviderToken): void {
  if (!userId) return;
  ensureVaultDir();
  const tokens = readTokens(userId);
  tokens[provider] = token;
  fs.writeFileSync(getTokenFile(userId), JSON.stringify(tokens, null, 2), 'utf-8');
}

export function deleteToken(userId: string, provider: string): void {
  if (!userId) return;
  ensureVaultDir();
  const tokens = readTokens(userId);
  delete tokens[provider];
  fs.writeFileSync(getTokenFile(userId), JSON.stringify(tokens, null, 2), 'utf-8');
}

export function isTokenExpired(token: ProviderToken): boolean {
  if (!token.expiry_date) return false;
  // Refresh 5 minutes before actual expiry
  return Date.now() >= token.expiry_date - 5 * 60 * 1000;
}
