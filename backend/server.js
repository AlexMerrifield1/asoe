// Load environment variables FIRST
import './config.js';

import express from 'express';
import cors from 'cors';
import generateRoute from './routes/generate.js';
import scrapePreviewRoute from './routes/scrapePreview.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/generate', generateRoute);
app.use('/api/scrape-preview', scrapePreviewRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ASOE Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ASOE Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate`);
});
