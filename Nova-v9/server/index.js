import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SERVER_CONFIG } from './config.js';
import { mongoDBService } from './services/mongodb.js';
import diagramRoutes from './routes/diagramRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = SERVER_CONFIG.PORT;

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    path: req.path,
    method: req.method,
    error: {
      message: err.message,
      stack: err.stack
    }
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Middleware
app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
}));

app.use(express.json({ 
  limit: SERVER_CONFIG.MAX_REQUEST_SIZE,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON:', e.message);
      res.status(400).json({ 
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    contentLength: req.get('content-length'),
    contentType: req.get('content-type')
  });
  next();
});

// Routes
app.use('/api', diagramRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mongodb: mongoDBService.isConnected ? 'connected' : 'disconnected'
  });
});

// Initialize MongoDB connection
async function initializeServer() {
  try {
    await mongoDBService.connect();
    console.log('MongoDB connection initialized');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoDBService.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

initializeServer();