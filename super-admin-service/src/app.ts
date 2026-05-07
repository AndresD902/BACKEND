import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

if (process.env['NODE_ENV'] !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
