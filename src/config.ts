import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, normalize } from 'path';
import { fileURLToPath } from 'url';
import type { AppConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadConfig(): AppConfig {
  const configPath = resolve(__dirname, '..', 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(`config.json not found at: ${configPath}`);
  }

  // Сначала двойные слэши → прямые, потом одиночные → прямые.
  // Это позволяет писать пути как C:\tasks, C:\\tasks или C:/tasks.
  const raw = readFileSync(configPath, 'utf-8')
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/');

  const config = JSON.parse(raw) as AppConfig;
  const normalized = normalizePaths(config);
  validateConfig(normalized);
  return normalized;
}

function normalizePaths(config: AppConfig): AppConfig {
  return {
    ...config,
    workDir: normalize(config.workDir),
    logDir: normalize(config.logDir),
  };
}

function validateConfig(config: AppConfig): void {
  if (!config.workDir) throw new Error('config: workDir is required');
  if (!config.logDir) throw new Error('config: logDir is required');
  if (!config.maxPagesPerDocument || config.maxPagesPerDocument < 1)
    throw new Error('config: maxPagesPerDocument must be >= 1');
  if (!existsSync(config.workDir))
    throw new Error(`workDir not found: ${config.workDir}`);
}
