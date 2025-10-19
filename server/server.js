// /server.js (MODIFIED)

import app from './app.js'; // Import the configured app
import connectDB from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB Connected...');

    // 2. Start the server
   app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`💾 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/fintracker'}`);
  console.log(`🔐 Admin Login: admin@financetracker.com / Admin@123`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Database Test: http://localhost:${PORT}/api/db-test`);
});
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Run the server
startServer();