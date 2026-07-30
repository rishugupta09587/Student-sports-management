import morgan from 'morgan';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const stream = { write: (message: string) => logger.info(message.trim()) };

export const requestLogger = morgan(env.isProduction ? 'combined' : 'dev', { stream });
