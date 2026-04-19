/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Structured Logger
 * ═══════════════════════════════════════════════════════════════
 * JSON logger compatible with Vercel log aggregation.
 * Writes to stdout with structured fields.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Order created', { orderId, userId });
 *   logger.error('Payment failed', { orderId }, err);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  orderId?: string;
  endpoint?: string;
  requestId?: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: IS_PROD ? undefined : error.stack,
      };
    } else {
      entry.error = String(error);
    }
  }

  const output = JSON.stringify(entry);

  switch (level) {
    case 'debug':
      if (!IS_PROD) console.debug(output);
      break;
    case 'info':
      console.log(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info:  (message: string, context?: LogContext) => log('info',  message, context),
  warn:  (message: string, context?: LogContext) => log('warn',  message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log('error', message, context, error),

  /**
   * Create a child logger with preset context fields.
   * Useful in route handlers to avoid repeating userId/endpoint.
   */
  child(preset: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) => log('debug', msg, { ...preset, ...ctx }),
      info:  (msg: string, ctx?: LogContext) => log('info',  msg, { ...preset, ...ctx }),
      warn:  (msg: string, ctx?: LogContext) => log('warn',  msg, { ...preset, ...ctx }),
      error: (msg: string, ctx?: LogContext, err?: unknown) =>
        log('error', msg, { ...preset, ...ctx }, err),
    };
  },
};
