import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import type { AppConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Чтение файла с автодетектом кодировки (UTF-8 / UTF-8 BOM / UTF-16 LE / CP1251) ───

const CP1251_MAP: number[] = [
  0x0402,0x0403,0x201A,0x0453,0x201E,0x2026,0x2020,0x2021,
  0x20AC,0x2030,0x0409,0x2039,0x040A,0x040C,0x040B,0x040F,
  0x0452,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,
  0x0000,0x2122,0x0459,0x203A,0x045A,0x045C,0x045B,0x045F,
  0x00A0,0x040E,0x045E,0x0408,0x00A4,0x0490,0x00A6,0x00A7,
  0x0401,0x00A9,0x0404,0x00AB,0x00AC,0x00AD,0x00AE,0x0407,
  0x00B0,0x00B1,0x0406,0x0456,0x0491,0x00B5,0x00B6,0x00B7,
  0x0451,0x2116,0x0454,0x00BB,0x0458,0x0405,0x0455,0x0457,
  0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,
  0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F,
  0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,
  0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F,
  0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,
  0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F,
  0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,
  0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F,
];

function decodeCp1251(buf: Buffer): string {
  return Array.from(buf, b =>
    b < 0x80 ? String.fromCharCode(b) : String.fromCharCode(CP1251_MAP[b - 0x80] ?? 0x3F)
  ).join('');
}

function readFileAuto(filePath: string): string {
  const buf = readFileSync(filePath);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf-8');
  if (buf[0] === 0xFF && buf[1] === 0xFE) return buf.slice(2).toString('utf16le');
  const asUtf8 = buf.toString('utf-8');
  return asUtf8.includes('\uFFFD') ? decodeCp1251(buf) : asUtf8;
}

// ─── Диалог выбора папки (Windows, без зависимостей) ───

function pickFolderDialog(description: string): string | null {
  try {
    const ps = [
      `Add-Type -AssemblyName System.Windows.Forms`,
      `$d = New-Object System.Windows.Forms.FolderBrowserDialog`,
      `$d.Description = '${description}'`,
      `$d.ShowNewFolderButton = $true`,
      `if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }`,
    ].join('; ');

    const result = execSync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8',
      windowsHide: true,
    }).trim();

    return result || null;
  } catch {
    return null;
  }
}

// ─── Сохранение конфига (всегда UTF-8) ───

function saveConfig(config: AppConfig, configPath: string): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

// ─── Публичный API ───

export function loadConfig(): AppConfig {
  const configPath = resolve(__dirname, '..', 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(`config.json not found at: ${configPath}`);
  }

  const raw = readFileAuto(configPath)
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/');

  const config = JSON.parse(raw) as AppConfig;
  const normalized = normalizePaths(config);
  const fixed = ensureWorkDir(normalized, configPath);
  validateConfig(fixed);
  return fixed;
}

function normalizePaths(config: AppConfig): AppConfig {
  return {
    ...config,
    workDir: normalize(config.workDir),
    logDir: normalize(config.logDir),
  };
}

function ensureWorkDir(config: AppConfig, configPath: string): AppConfig {
  if (existsSync(config.workDir)) return config;

  // workDir не существует — просим пользователя выбрать папку
  const chosen = pickFolderDialog('Выберите рабочую папку Foliant');

  if (!chosen) {
    throw new Error(
      `Рабочая папка не найдена: "${config.workDir}"\nВыбор папки отменён.`
    );
  }

  const updated: AppConfig = {
    ...config,
    workDir: normalize(chosen),
    logDir: normalize(resolve(chosen, 'logs')),
  };

  saveConfig(updated, configPath);
  return updated;
}

function validateConfig(config: AppConfig): void {
  if (!config.workDir) throw new Error('config: workDir is required');
  if (!config.logDir)  throw new Error('config: logDir is required');
  if (!config.maxPagesPerDocument || config.maxPagesPerDocument < 1)
    throw new Error('config: maxPagesPerDocument must be >= 1');
  if (!existsSync(config.workDir))
    throw new Error(`workDir not found: ${config.workDir}`);
}