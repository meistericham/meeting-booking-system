type LogMethod = (...args: any[]) => void;

const isDev = import.meta.env.DEV;

export const logger: {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
} = {
  debug: (...args) => {
    if (isDev) console.log(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};
