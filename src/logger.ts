import winston from 'winston';
import { mkdirSync } from 'fs';
import path from 'path';

export function createLogger(logDir: string): winston.Logger {
  mkdirSync(logDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFile = path.join(logDir, `run_${timestamp}.log`);

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) =>
        `[${timestamp}] ${level.toUpperCase()}: ${message}`
      )
    ),
    transports: [
      new winston.transports.File({ filename: logFile }),
    ],
  });
}
