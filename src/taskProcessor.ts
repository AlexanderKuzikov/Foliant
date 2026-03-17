import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import type winston from 'winston';
import type { AppConfig, LayoutKey, TaskResult } from './types.js';
import { rasterizePdfs } from './rasterizer.js';
import { buildPdf } from './pdfBuilder.js';

export async function processTask(
  taskDir: string,
  config: AppConfig,
  logger: winston.Logger
): Promise<TaskResult> {
  const taskName = path.basename(taskDir);
  const startTime = Date.now();
  logger.info(`=== Task start: ${taskName} ===`);

  const tempDir = path.join(taskDir, '_tmp');

  try {
    const entries = await fs.readdir(taskDir);
    const pdfFiles = entries
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort()
      .map(f => path.join(taskDir, f));

    if (pdfFiles.length === 0) {
      throw new Error('No PDF files found in task directory');
    }

    logger.info(`PDFs: ${pdfFiles.map(f => path.basename(f)).join(', ')}`);

    let totalPages = 0;
    for (const pdfPath of pdfFiles) {
      const bytes = await fs.readFile(pdfPath);
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      totalPages += pdf.getPageCount();
    }
    logger.info(`Total pages: ${totalPages}`);

    const layoutKey = selectLayout(totalPages, config.maxPagesPerDocument);
    const layout = config.layout[layoutKey];
    logger.info(`Layout: ${layoutKey} | ${layout.pagesPerSheet} per sheet | ${layout.rasterDpi} DPI | quality ${layout.jpegQuality}`);

    const imagePaths = await rasterizePdfs(
      pdfFiles,
      tempDir,
      layout.rasterDpi,
      layout.jpegQuality,
      logger
    );
    logger.info(`Rasterized: ${imagePaths.length} images`);

    const pdfBytes = await buildPdf(imagePaths, layout, config.margins);

    const outputFilename = config.outputFilePrefix
      ? `${config.outputFilePrefix}_${taskName}.pdf`
      : `${taskName}.pdf`;
    const outputPath = path.join(taskDir, outputFilename);
    await fs.writeFile(outputPath, pdfBytes);
    logger.info(`Saved: ${outputFilename}`);

    if (config.deleteSourcePdfs) {
      for (const pdfPath of pdfFiles) {
        await fs.unlink(pdfPath);
        logger.info(`Deleted source: ${path.basename(pdfPath)}`);
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info(`Task done in ${(durationMs / 1000).toFixed(2)}s`);

    return { taskName, success: true, totalPages, layoutUsed: layoutKey, outputFile: outputPath, durationMs };

  } catch (error) {
    const message = (error as Error).message;
    logger.error(`Task "${taskName}" failed: ${message}`);
    return { taskName, success: false, error: message, durationMs: Date.now() - startTime };

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function selectLayout(totalPages: number, max: number): LayoutKey {
  if (totalPages <= max) return 'single';
  if (totalPages <= max * 2) return 'twoPerSheet';
  return 'fourPerSheet';
}
