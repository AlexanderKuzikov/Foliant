import { PDFiumLibrary, type PDFiumPageRenderOptions } from '@hyzyla/pdfium';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import type winston from 'winston';

let library: PDFiumLibrary | null = null;

async function getLibrary(): Promise<PDFiumLibrary> {
  if (!library) library = await PDFiumLibrary.init();
  return library;
}

async function renderToJpeg(options: PDFiumPageRenderOptions): Promise<Buffer> {
  return sharp(options.data, {
    raw: {
      width: options.width,
      height: options.height,
      channels: 4,
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function rasterizePdfs(
  pdfPaths: string[],
  tempDir: string,
  dpi: number,
  logger: winston.Logger
): Promise<string[]> {
  await fs.mkdir(tempDir, { recursive: true });

  const lib = await getLibrary();
  const scale = dpi / 72;
  const allImages: string[] = [];

  for (let fileIdx = 0; fileIdx < pdfPaths.length; fileIdx++) {
    const pdfPath = pdfPaths[fileIdx];
    logger.info(`Rasterizing: ${path.basename(pdfPath)} at ${dpi} DPI`);

    const pdfBuffer = await fs.readFile(pdfPath);
    const document = await lib.loadDocument(pdfBuffer);

    for (const page of document.pages()) {
      const image = await page.render({ scale, render: renderToJpeg });

      const imageName = `f${String(fileIdx).padStart(3, '0')}_p${String(page.number).padStart(4, '0')}.jpg`;
      const imagePath = path.join(tempDir, imageName);

      await fs.writeFile(imagePath, Buffer.from(image.data));
      allImages.push(imagePath);
    }

    document.destroy();
  }

  return allImages.sort();
}
