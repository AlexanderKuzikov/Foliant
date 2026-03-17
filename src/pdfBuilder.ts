import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';
import type { LayoutProfile, Margins } from './types.js';

const A4 = { width: 595.28, height: 841.89 };
const MM_TO_PT = 72 / 25.4;

interface Size { width: number; height: number; }
interface Placement { x: number; y: number; width: number; height: number; }

function getPageSize(orientation: 'portrait' | 'landscape'): Size {
  return orientation === 'portrait'
    ? { width: A4.width, height: A4.height }
    : { width: A4.height, height: A4.width };
}

function marginsInPt(margins: Margins) {
  return {
    top:    margins.top    * MM_TO_PT,
    right:  margins.right  * MM_TO_PT,
    bottom: margins.bottom * MM_TO_PT,
    left:   margins.left   * MM_TO_PT,
  };
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
  layout: LayoutProfile,
  margins: Margins,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageSize = getPageSize(layout.orientation);
  const m = marginsInPt(margins);

  // Рабочая область внутри полей
  const contentWidth  = pageSize.width  - m.left - m.right;
  const contentHeight = pageSize.height - m.top  - m.bottom;

  const cellWidth  = contentWidth  / layout.cols;
  const cellHeight = contentHeight / layout.rows;

  for (let i = 0; i < imagePaths.length; i += layout.pagesPerSheet) {
    const page = doc.addPage([pageSize.width, pageSize.height]);
    const batch = imagePaths.slice(i, i + layout.pagesPerSheet);

    for (let j = 0; j < batch.length; j++) {
      const col = j % layout.cols;
      const row = Math.floor(j / layout.cols);

      const imgBytes = await fs.readFile(batch[j]);
      const img = await doc.embedJpg(imgBytes);

      // pdf-lib: origin bottom-left
      const offsetX = m.left + col * cellWidth;
      const offsetY = m.bottom + (layout.rows - 1 - row) * cellHeight;

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
