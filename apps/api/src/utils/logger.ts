/**
 * Centralized Production Structured Logger
 * Outputs formatted JSON logs in production and clean colored logs in development.
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    if (isProd) {
      console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.log(`ℹ️ [INFO] ${message}`, meta ? meta : '');
    }
  },
  error: (message: string, error?: any) => {
    if (isProd) {
      console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message, error: error?.message || error }));
    } else {
      console.error(`❌ [ERROR] ${message}`, error ? error : '');
    }
  },
  warn: (message: string, meta?: Record<string, any>) => {
    if (isProd) {
      console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.warn(`⚠️ [WARN] ${message}`, meta ? meta : '');
    }
  },
};
