type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  event: string;
  ts: number;
  [key: string]: unknown;
}

const emit = (payload: LogPayload) => {
  let method: Console['log'];

  if (payload.level === 'error') {
    method = console.error;
  } else if (payload.level === 'warn') {
    method = console.warn;
  } else {
    method = console.log;
  }

  // JSON format = searchable in Vercel Logs tab
  method(JSON.stringify(payload));
};

export const logger = {
  info: (event: string, data?: Record<string, unknown>) =>
    emit({ level: 'info', event, ts: Date.now(), ...data }),

  warn: (event: string, data?: Record<string, unknown>) =>
    emit({ level: 'warn', event, ts: Date.now(), ...data }),

  error: (event: string, error: unknown, data?: Record<string, unknown>) => {
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null) {
      message = JSON.stringify(error);
    } else {
      message = JSON.stringify(error);
    }
    return emit({
      level: 'error',
      event,
      ts: Date.now(),
      message,
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    });
  },
};