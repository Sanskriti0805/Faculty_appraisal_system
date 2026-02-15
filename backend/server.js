const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const facultyRoutes = require('./routes/facultyRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const publicationsRoutes = require('./routes/publicationsRoutes');
const grantsRoutes = require('./routes/grantsRoutes');
const patentsRoutes = require('./routes/patentsRoutes');
const reviewsRoutes = require('./routes/reviewsRoutes');
const awardsRoutes = require('./routes/awardsRoutes');

// API Routes
app.use('/api/faculty', facultyRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/publications', publicationsRoutes);
app.use('/api/grants', grantsRoutes);
app.use('/api/patents', patentsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/awards', awardsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
});

module.exports = app;
