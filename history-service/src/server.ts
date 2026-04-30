import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';

const start = async (): Promise<void> => {
  await connectDatabase();
  console.log(`[${env.serviceName}] Database connected`);

  app.listen(env.port, () => {
    console.log(`[${env.serviceName}] Running on port ${env.port}`);
  });
};

start().catch((err) => {
  console.error(`[history-service] Failed to start:`, err);
  process.exit(1);
});
