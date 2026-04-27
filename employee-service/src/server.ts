import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`${env.serviceName} running on port ${env.port}`);
    });

    const shutdown = async (): Promise<void> => {
      console.log(`Shutting down ${env.serviceName}...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(`Failed to start ${env.serviceName}`, error);
    process.exit(1);
  }
}

void bootstrap();
