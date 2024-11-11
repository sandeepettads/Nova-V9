export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3001,
  MAX_REQUEST_SIZE: '50mb',
  CORS_ENABLED: true,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017'
};