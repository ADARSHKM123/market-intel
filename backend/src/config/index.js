import 'dotenv/config';

const config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8001',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  youtubeDailyQuota: parseInt(process.env.YOUTUBE_DAILY_QUOTA || '10000', 10),
};

export default config;
