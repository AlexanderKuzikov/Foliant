import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export async function ensureIcon(iconPath: string): Promise<void> {
  try {
    await fs.access(iconPath);
    return;
  } catch {}

  await fs.mkdir(path.dirname(iconPath), { recursive: true });

  // Генерируем 16x16 PNG — синий квадрат с белой буквой F
  const size = 16;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="3" fill="#2563EB"/>
      <text x="4" y="12" font-family="Arial" font-size="11"
            font-weight="bold" fill="white">F</text>
    </svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Оборачиваем PNG в ICO-формат (PNG-in-ICO, Windows Vista+)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size, 0);
  dirEntry.writeUInt8(size, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4);
  dirEntry.writeUInt16LE(32, 6);
  dirEntry.writeUInt32LE(pngBuffer.length, 8);
  dirEntry.writeUInt32LE(22, 12);

  await fs.writeFile(iconPath, Buffer.concat([header, dirEntry, pngBuffer]));
}
