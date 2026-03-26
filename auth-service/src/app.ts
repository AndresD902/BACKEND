import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware';

const app = express();

app.use(helmet());
app.use(cors());

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/v1', routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
