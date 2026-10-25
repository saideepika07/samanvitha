// Express Application Setup & Global Middleware Configuration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes.js');
const institutionRoutes = require('./routes/institutionRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const needRoutes = require('./routes/needRoutes.js');
const donationRoutes = require('./routes/donationRoutes.js');
const matchRoutes = require('./routes/matchRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const disputeRoutes = require('./routes/disputeRoutes.js');
const { apiLimiter } = require('./middleware/rateLimiter.js');
const errorHandler = require('./middleware/errorHandler.js');

const mongoose = require('mongoose');

const app = express();

// Trust reverse proxy (e.g., Render, Heroku) for accurate client IP resolution in rate limiting
app.set('trust proxy', 1);

// Security HTTP Headers
app.use(helmet());

// Cross-Origin Resource Sharing: strictly allow only origins in CLIENT_URL (comma-separated, no wildcards)
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = rawClientUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => Boolean(origin) && origin !== '*');

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const path = require('path');
const { PHOTOS_DIR } = require('./services/storage/storageAdapter.js');

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve public donation photos (Private verification documents are NEVER served statically)
app.use('/uploads/photos', express.static(PHOTOS_DIR));

// Apply rate limiting to all /api/ routes
app.use('/api', apiLimiter);

// Health check endpoint (reports operational status and database connection state without exposing secrets)
app.get('/api/health', (req, res) => {
  const dbStateCode = mongoose.connection.readyState;
  const dbStateLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const isDbConnected = dbStateCode === 1;

  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    status: isDbConnected ? 'healthy' : 'degraded',
    database: {
      status: dbStateLabels[dbStateCode] || 'unknown',
      connected: isDbConnected,
    },
    timestamp: new Date().toISOString(),
    service: 'Samanvitha API',
    env: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/needs', needRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);

// Catch-all 404 handler for unmapped routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}. Route not found on this server.`,
  });
});

// Central Error Handling Middleware (must be after all routes)
app.use(errorHandler);

module.exports = app;
