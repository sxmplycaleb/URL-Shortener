/* global console, process */

import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '5000';
process.env.CLIENT_URL = 'http://127.0.0.1:5173,http://localhost:5173';
process.env.SHORT_URL_BASE = 'http://127.0.0.1:5000';
process.env.HASH_SALT = process.env.HASH_SALT ?? 'test-hash-salt-value';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-access-secret-with-enough-length';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-with-enough-length';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
process.env.RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.URL_CREATION_RATE_LIMIT_MAX = '1000';
process.env.REDIRECT_RATE_LIMIT_MAX = '1000';
process.env.PASSWORD_RATE_LIMIT_MAX = '1000';
process.env.OTP_GENERATION_RATE_LIMIT_MAX = '1000';
process.env.OTP_VERIFICATION_RATE_LIMIT_MAX = '5';

const [
  { connectDatabase, disconnectDatabase },
  { createApp },
  { default: APIKey },
  { default: APIUsage },
  { default: Click },
  { default: RefreshToken },
  { default: URLModel },
  { default: User },
] =
  await Promise.all([
    import('../../backend/config/database.js'),
    import('../../backend/app.js'),
    import('../../backend/models/APIKey.js'),
    import('../../backend/models/APIUsage.js'),
    import('../../backend/models/Click.js'),
    import('../../backend/models/RefreshToken.js'),
    import('../../backend/models/URL.js'),
    import('../../backend/models/User.js'),
  ]);

const mongoServer = await MongoMemoryServer.create({
  instance: {
    launchTimeout: 60_000,
  },
});

await connectDatabase({
  uri: mongoServer.getUri(),
  maxRetries: 1,
  mongooseOptions: { dbName: 'url-shortener-e2e' },
});
await Promise.all([User.syncIndexes(), URLModel.syncIndexes(), Click.syncIndexes(), RefreshToken.syncIndexes(), APIKey.syncIndexes(), APIUsage.syncIndexes()]);

const app = createApp();
const server = app.listen(Number(process.env.PORT), () => {
  console.log(`E2E API server listening on port ${process.env.PORT}.`);
});

async function shutdown() {
  server.close(async () => {
    await disconnectDatabase();
    await mongoServer.stop();
    process.exit(0);
  });
}

process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
