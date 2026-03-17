import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { processTask } from './taskProcessor.js';

function notify(title: string, message: string): void {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    $notify = New-Object System.Windows.Forms.NotifyIcon;
    $notify.Icon = [System.Drawing.SystemIcons]::Information;
    $notify.Visible = $true;
    $notify.ShowBalloonTip(5000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info);
    Start-Sleep -Milliseconds 5000;
    $notify.Dispose();
  `.replace(/\n\s+/g, ' ').trim();

  exec(`powershell -NoProfile -WindowStyle Hidden -Command "${script}"`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logDir);
  const resolvedLogDir = path.resolve(config.logDir);

  logger.info('PDF Processor started');
  logger.info(`workDir: ${config.workDir}`);

  try {
    const entries = await fs.readdir(config.workDir, { withFileTypes: true });

    const taskDirs = entries
      .filter(e => {
        if (!e.isDirectory()) return false;
        if (e.name.startsWith('_') || e.name.startsWith('.')) return false;
        const fullPath = path.resolve(config.workDir, e.name);
        return fullPath !== resolvedLogDir;
      })
      .map(e => path.join(config.workDir, e.name));

    if (taskDirs.length === 0) {
      logger.info('No task folders found. Exiting.');
      return;
    }

    logger.info(`Found ${taskDirs.length} task(s): ${taskDirs.map(d => path.basename(d)).join(', ')}`);

    const results = [];
    for (const taskDir of taskDirs) {
      const result = await processTask(taskDir, config, logger);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`All done — success: ${succeeded}, failed: ${failed}`);

    notify(
      failed === 0 ? 'Foliant ✅' : 'Foliant ⚠️',
      failed === 0
        ? `${succeeded} task(s) completed successfully`
        : `${succeeded} OK, ${failed} failed. Check logs.`
    );

  } catch (error) {
    const message = (error as Error).message;
    logger.error(`Fatal: ${message}`);
    notify('Foliant ❌', `Fatal error: ${message}`);
    process.exit(1);
  }
}

main();
