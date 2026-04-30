const formatMessage = (level: string, message: string): string =>
  `[${new Date().toISOString()}] [${level}] ${message}`;

export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    process.stdout.write(formatMessage('INFO', message) + ' ' + args.join(' ') + '\n');
  },
  warn: (message: string, ...args: unknown[]): void => {
    process.stdout.write(formatMessage('WARN', message) + ' ' + args.join(' ') + '\n');
  },
  error: (message: string, ...args: unknown[]): void => {
    process.stderr.write(formatMessage('ERROR', message) + ' ' + args.join(' ') + '\n');
  },
};
