require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const reviewRoutes = require('./routes/reviews');
app.use('/api/reviews', reviewRoutes);

// Worker
const { processReviews } = require('./worker');
// Process reviews initially on startup for testing
// processReviews();

// Background job
cron.schedule('*/30 * * * *', processReviews);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
