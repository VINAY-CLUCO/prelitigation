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

export function readTokens(): TokenStore {
  try {
    ensureVaultDir();
    if (!fs.existsSync(TOKEN_FILE)) return {};
    const raw = fs.readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(raw) as TokenStore;
  } catch {
    return {};
  }
}

export function getToken(provider: string): ProviderToken | null {
  const tokens = readTokens();
  return tokens[provider] ?? null;
}

export function writeToken(provider: string, token: ProviderToken): void {
  ensureVaultDir();
  const tokens = readTokens();
  tokens[provider] = token;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function deleteToken(provider: string): void {
  ensureVaultDir();
  const tokens = readTokens();
  delete tokens[provider];
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function isTokenExpired(token: ProviderToken): boolean {
  if (!token.expiry_date) return false;
  // Refresh 5 minutes before actual expiry
  return Date.now() >= token.expiry_date - 5 * 60 * 1000;
}
