import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('sports_staff_db');
  process.env.PORT = process.env.PORT ?? '5000';
  process.env.NODE_ENV = 'development';

  console.log('Local in-memory MongoDB URI:', process.env.MONGODB_URI);

  const { connectDatabase } = await import('./src/config/database');
  const { createApp } = await import('./src/app');

  await connectDatabase();
  const app = createApp();
  app.listen(Number(process.env.PORT), () => {
    console.log(`DEV_SERVER_READY on port ${process.env.PORT}`);
  });
}

main().catch((err) => {
  console.error('DEV_SERVER_FAILED', err);
  process.exit(1);
});
