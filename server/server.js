// Server Entrypoint
require('dotenv').config();
const app = require('./src/app.js');
const connectDB = require('./src/config/db.js');

const PORT = process.env.PORT || 5000;

// Validate storage adapter configuration (strictly guards against ephemeral disk loss in production)
const { validateStorageConfig } = require('./src/services/storage/storageAdapter.js');
validateStorageConfig();

// Validate production secrets (guards against missing/weak JWT_SECRET and default ADMIN_PASSWORD)
const { validateProductionSecrets } = require('./src/config/securityValidator.js');
validateProductionSecrets();

// Connect to MongoDB Atlas / local database
connectDB();

// Start periodic reservation expiry sweep (runs in background with unref timer)
const { startPeriodicSweep } = require('./src/services/reservationExpiryService.js');
startPeriodicSweep();

const server = app.listen(PORT, () => {
  console.log(`\n================================================================================`);
  console.log(`Samanvitha API Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Allowed client origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`================================================================================\n`);
});

// Handle unhandled Promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process on fatal errors
  server.close(() => process.exit(1));
});

module.exports = server;
