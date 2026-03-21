import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { processTask } from './taskProcessor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logDir);

  let tray: any = null;

  if (isWindows) {
    const { TrayManager } = await import('./tray.js');
    const { ensureIcon } = await import('./icon.js');
    const iconPath = path.resolve(__dirname, '..', 'assets', 'icon.ico');
    await ensureIcon(iconPath);
    tray = new TrayManager(iconPath, config.workDir, config.logDir);
    tray.start();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  logger.info('Foliant started');
  logger.info(`Platform: ${process.platform}`);
  logger.info(`workDir: ${config.workDir}`);

  const setStatus = (text: string) => {
    logger.info(text);
    tray?.setStatus(text);
  };

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
      if (isWindows) {
        tray?.setStatus('Нет задач');
        setTimeout(() => tray?.kill(), 3000);
      }
      process.exit(0);
    }

    logger.info(`Found ${taskDirs.length} task(s)`);

    const results = [];
    for (let i = 0; i < taskDirs.length; i++) {
      const taskName = path.basename(taskDirs[i]);
      setStatus(`Обработка: ${taskName} (${i + 1}/${taskDirs.length})`);

      const result = await processTask(taskDirs[i], config, logger);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`All done — success: ${succeeded}, failed: ${failed}`);

    if (isWindows) {
      tray?.setStatus(
        failed === 0
          ? `Готово ✓ (${succeeded} задач)`
          : `Ошибки: ${failed} из ${succeeded + failed}`
      );
      setTimeout(() => tray?.kill(), 10_000);
    } else {
      process.exit(failed > 0 ? 1 : 0);
    }

  } catch (error) {
    const message = (error as Error).message;
    logger.error(`Fatal: ${message}`);

    if (isWindows) {
      tray?.setStatus(`Ошибка: ${message}`);
    } else {
      process.exit(1);
    }
  }
}

main();
