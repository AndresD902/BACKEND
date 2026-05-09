import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
}));

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/v1', routes);
app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
