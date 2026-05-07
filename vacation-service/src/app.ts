import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler.middleware';

const app = express();

app.use(helmet());

app.use(cors({
  origin: env.corsOrigins,
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10kb' }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
