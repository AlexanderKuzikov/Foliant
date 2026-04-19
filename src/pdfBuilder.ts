import { PDFDocument, degrees } from 'pdf-lib';
import { promises as fs } from 'fs';
import type { LayoutProfile, Margins } from './types.js';

const A4 = { width: 595.28, height: 841.89 };
const MM_TO_PT = 72 / 25.4;

interface Size { width: number; height: number; }

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

export async function buildPdf(
  imagePaths: string[],
  layout: LayoutProfile,
  margins: Margins,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageSize = getPageSize(layout.orientation);
  const m = marginsInPt(margins);

  const contentWidth  = pageSize.width  - m.left - m.right;
  const contentHeight = pageSize.height - m.top  - m.bottom;

  const cellWidth  = contentWidth  / layout.cols;
  const cellHeight = contentHeight / layout.rows;

  const rotate = layout.rotateContent ?? 0;
  const isRotated = rotate === 90 || rotate === 270;

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

      let drawX: number, drawY: number, drawW: number, drawH: number;

      if (isRotated) {
        // При rotate 90° CCW: visual_width = drawH, visual_height = drawW
        // Вписываем visual (drawH x drawW) в ячейку (cellWidth x cellHeight):
        const scale = Math.min(cellHeight / img.width, cellWidth / img.height);
        drawW = img.width  * scale;
        drawH = img.height * scale;
        // Центрируем: visual x_range=[drawX-drawH..drawX], y_range=[drawY..drawY+drawW]
        drawX = offsetX + (cellWidth  - drawH) / 2 + drawH;
        drawY = offsetY + (cellHeight - drawW) / 2;
      } else {
        const scale = Math.min(cellWidth / img.width, cellHeight / img.height);
        drawW = img.width  * scale;
        drawH = img.height * scale;
        drawX = offsetX + (cellWidth  - drawW) / 2;
        drawY = offsetY + (cellHeight - drawH) / 2;
      }

      page.drawImage(img, {
        x:      drawX,
        y:      drawY,
        width:  drawW,
        height: drawH,
        rotate: degrees(rotate),
      });
    }
  }

  return doc.save();
}