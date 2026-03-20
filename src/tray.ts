import { exec } from 'child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SysTray = require('systray2').default ?? require('systray2');

const SEPARATOR = {
  title: '<SEPARATOR>',
  tooltip: '',
  checked: false,
  enabled: true,
};

export class TrayManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private systray: any = null;
  private iconPath: string;
  private workDir: string;
  private logDir: string;

  constructor(iconPath: string, workDir: string, logDir: string) {
    this.iconPath = iconPath;
    this.workDir = workDir;
    this.logDir = logDir;
  }

  start(): void {
    this.systray = new SysTray({
      menu: {
        icon: this.iconPath,
        title: '',
        tooltip: 'Foliant',
        items: [
          { title: 'Запуск...', tooltip: '', checked: false, enabled: true },
          SEPARATOR,
          { title: 'Открыть папку задач', tooltip: '', checked: false, enabled: true },
          { title: 'Открыть логи',        tooltip: '', checked: false, enabled: true },
          SEPARATOR,
          { title: 'Выход',               tooltip: '', checked: false, enabled: true },
        ],
      },
      debug: false,
      copyDir: true,
    });

    this.systray.onClick((action: any) => {
      switch (action.seq_id) {
        case 2: exec(`explorer "${this.workDir}"`); break;
        case 3: exec(`explorer "${this.logDir}"`);  break;
        case 5: this.kill(); break;
      }
    });
  }

  setStatus(text: string): void {
    if (!this.systray) return;
    this.systray.sendAction({
      type: 'update-item',
      seq_id: 0,
      item: { title: text, tooltip: '', checked: false, enabled: true },
    });
  }

  kill(exit = true): void {
    this.systray?.kill(exit);
  }
}
