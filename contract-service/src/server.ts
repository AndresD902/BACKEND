import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { startExpireEndedContractsJob } from './jobs/expire-ended-contracts.job';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log(`${env.serviceName} running on port ${env.port}`);
  });
  const expirationJob = startExpireEndedContractsJob();

  async function shutdown(): Promise<void> {
    clearInterval(expirationJob);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('Application startup failed:', error);
  process.exit(1);
});
