import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRoutes);
app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
