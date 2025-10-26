const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stokvel Pro Backend API',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Stokvel API is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Stokvels routes
app.get('/api/stokvels', (req, res) => {
  res.json({
    message: 'Get all stokvels endpoint',
    data: []
  });
});

app.post('/api/stokvels', (req, res) => {
  res.json({
    message: 'Create stokvel endpoint',
    data: req.body
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Stokvel Pro Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏠 API Base: http://localhost:${PORT}/`);
});
