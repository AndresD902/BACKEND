import app from './app';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  try {
    const server = app.listen(env.port, () => {
      console.log(`${env.serviceName} running on port ${env.port} (stateless aggregator)`);
    });

    const shutdown = (): void => {
      console.log(`Shutting down ${env.serviceName}...`);
      server.close(() => process.exit(0));
    };

    process.on('SIGINT',  shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(`Failed to start ${env.serviceName}`, error);
    process.exit(1);
  }
}

void bootstrap();
