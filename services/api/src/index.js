require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { verifyToken } = require('./middleware/auth');
const errorHandler = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global 8-second request timeout middleware
app.use((req, res, next) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timed out',
        code: 'TIMEOUT'
      });
    }
  }, 8000);

  res.on('finish', () => clearTimeout(timeoutId));
  res.on('close', () => clearTimeout(timeoutId));

  next();
});

// Log requests using morgan in non-production environments
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    return res.status(200).json({
      data: {
        status: 'ok',
        timestamp: Date.now()
      },
      message: 'ok'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to retrieve system status',
      code: 'SERVER_ERROR'
    });
  }
});

// Auth router
app.use('/api/auth', require('./routes/auth'));

// Users router
app.use('/api/users', require('./routes/users'));

// Journeys router
app.use('/api/journeys', require('./routes/journeys'));

// Conditional routes for Members 2-5 (fail-safe if files do not exist yet)
const safeRequire = (path) => {
  try { return require(path); } catch (e) { return null; }
};
const tatkalRoutes = safeRequire('./routes/tatkal');
const complaintRoutes = safeRequire('./routes/complaints');
const safetyRoutes = safeRequire('./routes/safety');
const amenityRoutes = safeRequire('./routes/amenities');

if (tatkalRoutes) app.use('/api/tatkal', tatkalRoutes);
if (complaintRoutes) app.use('/api/complaints', complaintRoutes);
if (safetyRoutes) app.use('/api/safety', safetyRoutes);
if (amenityRoutes) app.use('/api/amenities', amenityRoutes);


// Protected test endpoint for verification
app.get('/api/protected', verifyToken, (req, res) => {
  try {
    return res.status(200).json({
      data: {
        message: 'Access granted to protected route',
        user: req.user
      },
      message: 'ok'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Protected route execution failed',
      code: 'SERVER_ERROR'
    });
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND'
  });
});

// Mount global error handler as the last middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`RailSaathi API running on port ${PORT}`);
});

