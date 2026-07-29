import path from 'path';
import fs from 'fs';

// Store all tenant data inside the project directory for easy deployment (e.g. Railway)
export const GLOBAL_VAULT_DIR = path.join(process.cwd(), '.cluco_data');

export function getUserVaultDir(userId: string): string {
  if (!userId) throw new Error('userId is required to access the vault');
  const userDir = path.join(GLOBAL_VAULT_DIR, 'users', userId, 'vault');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

export function getUserProviderVaultDir(userId: string, provider: string): string {
  const base = getUserVaultDir(userId);
  const providerDir = path.join(base, provider);
  if (!fs.existsSync(providerDir)) {
    fs.mkdirSync(providerDir, { recursive: true });
  }
  return providerDir;
}
