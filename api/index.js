import app from '../server/app.js';
import connectDB from '../server/config/database.js';

// Connect to MongoDB when the Vercel serverless function starts
connectDB().catch(console.error);

// Export the Express app as a Vercel serverless function handler
export default app;
