import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { processTask } from './taskProcessor.js';
import { TrayManager } from './tray.js';
import { ensureIcon } from './icon.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logDir);

  const iconPath = path.resolve(__dirname, '..', 'assets', 'icon.ico');
  await ensureIcon(iconPath);

  const tray = new TrayManager(iconPath, config.workDir, config.logDir);
  tray.start();

  // Небольшая пауза чтобы трей успел инициализироваться
  await new Promise(resolve => setTimeout(resolve, 500));

  logger.info('Foliant started');
  logger.info(`workDir: ${config.workDir}`);

  try {
    const resolvedLogDir = path.resolve(config.logDir);
    const entries = await fs.readdir(config.workDir, { withFileTypes: true });

    const taskDirs = entries
      .filter(e => {
        if (!e.isDirectory()) return false;
        if (e.name.startsWith('_') || e.name.startsWith('.')) return false;
        return path.resolve(config.workDir, e.name) !== resolvedLogDir;
      })
      .map(e => path.join(config.workDir, e.name));

    if (taskDirs.length === 0) {
      logger.info('No task folders found. Exiting.');
      tray.setStatus('Нет задач');
      setTimeout(() => tray.kill(), 3000);
      return;
    }

    logger.info(`Found ${taskDirs.length} task(s)`);

    const results = [];
    for (let i = 0; i < taskDirs.length; i++) {
      const taskName = path.basename(taskDirs[i]);
      tray.setStatus(`Обработка: ${taskName} (${i + 1}/${taskDirs.length})`);
      logger.info(`Processing task ${i + 1}/${taskDirs.length}: ${taskName}`);

      const result = await processTask(taskDirs[i], config, logger);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`All done — success: ${succeeded}, failed: ${failed}`);

    tray.setStatus(
      failed === 0
        ? `Готово ✓ (${succeeded} задач)`
        : `Ошибки: ${failed} из ${succeeded + failed}`
    );

    setTimeout(() => tray.kill(), 10_000);

  } catch (error) {
    const message = (error as Error).message;
    logger.error(`Fatal: ${message}`);
    tray.setStatus(`Ошибка: ${message}`);
  }
}

main();
