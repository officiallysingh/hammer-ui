import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    base: { service: 'web' },
    transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
});
