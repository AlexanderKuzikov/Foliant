import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';
import type { LayoutProfile } from './types.js';

const A4 = { width: 595.28, height: 841.89 };

interface Size { width: number; height: number; }
interface Placement { x: number; y: number; width: number; height: number; }

function getPageSize(orientation: 'portrait' | 'landscape'): Size {
  return orientation === 'portrait'
    ? { width: A4.width, height: A4.height }
    : { width: A4.height, height: A4.width };
}

function fitInCell(img: Size, cell: Size, offsetX: number, offsetY: number): Placement {
  const scale = Math.min(cell.width / img.width, cell.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  return {
    x: offsetX + (cell.width - w) / 2,
    y: offsetY + (cell.height - h) / 2,
    width: w,
    height: h,
  };
}

export async function buildPdf(
  imagePaths: string[],
  layout: LayoutProfile
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageSize = getPageSize(layout.orientation);
  const cellWidth = pageSize.width / layout.cols;
  const cellHeight = pageSize.height / layout.rows;

  for (let i = 0; i < imagePaths.length; i += layout.pagesPerSheet) {
    const page = doc.addPage([pageSize.width, pageSize.height]);
    const batch = imagePaths.slice(i, i + layout.pagesPerSheet);

    for (let j = 0; j < batch.length; j++) {
      const col = j % layout.cols;
      const row = Math.floor(j / layout.cols);

      const imgBytes = await fs.readFile(batch[j]);
      const img = await doc.embedJpg(imgBytes);

      const offsetX = col * cellWidth;
      const offsetY = (layout.rows - 1 - row) * cellHeight;

      const placement = fitInCell(
        { width: img.width, height: img.height },
        { width: cellWidth, height: cellHeight },
        offsetX,
        offsetY
      );

      page.drawImage(img, placement);
    }
  }

  return doc.save();
}
