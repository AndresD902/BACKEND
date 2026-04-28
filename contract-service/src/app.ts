import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_request, response) => {
  response.status(200).json({
    success: true,
    service: env.serviceName,
    status: 'healthy',
  });
});
