import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Create indexes for better performance
    await createIndexes();
    
    // Create default categories
    await createDefaultCategories();
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.connection.collection('users').createIndex({ username: 1 }, { unique: true });
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Income indexes
    await mongoose.connection.collection('incomes').createIndex({ userId: 1, date: -1 });
    await mongoose.connection.collection('incomes').createIndex({ userId: 1, category: 1 });
    
    // Expense indexes
    await mongoose.connection.collection('expenses').createIndex({ userId: 1, date: -1 });
    await mongoose.connection.collection('expenses').createIndex({ userId: 1, category: 1 });
    
    // Budget indexes
    await mongoose.connection.collection('budgets').createIndex({ userId: 1, month: 1, year: 1 });
    
    // Category indexes
    await mongoose.connection.collection('categories').createIndex({ userId: 1, name: 1, type: 1 }, { unique: true });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.log('Indexes already exist or error creating indexes:', error.message);
  }
};

const createDefaultCategories = async () => {
  try {
    // Import Category model dynamically to avoid circular dependency
    const { default: Category } = await import('../models/Category.js');
    
    const defaultCategories = [
      // Income Categories
      { name: 'Salary', type: 'income', color: '#10b981' },
      { name: 'Freelance', type: 'income', color: '#3b82f6' },
      { name: 'Business', type: 'income', color: '#8b5cf6' },
      { name: 'Investment', type: 'income', color: '#f59e0b' },
      { name: 'Rental Income', type: 'income', color: '#06b6d4' },
      { name: 'Bonus', type: 'income', color: '#84cc16' },
      { name: 'Commission', type: 'income', color: '#f97316' },
      { name: 'Gift', type: 'income', color: '#ec4899' },
      { name: 'Dividends', type: 'income', color: '#6366f1' },
      { name: 'Side Hustle', type: 'income', color: '#14b8a6' },
      { name: 'Refunds', type: 'income', color: '#f472b6' },
      { name: 'Other Income', type: 'income', color: '#64748b' },
      
      // Expense Categories
      { name: 'Food & Dining', type: 'expense', color: '#ef4444' },
      { name: 'Transportation', type: 'expense', color: '#06b6d4' },
      { name: 'Shopping', type: 'expense', color: '#84cc16' },
      { name: 'Entertainment', type: 'expense', color: '#f97316' },
      { name: 'Bills & Utilities', type: 'expense', color: '#64748b' },
      { name: 'Healthcare', type: 'expense', color: '#dc2626' },
      { name: 'Education', type: 'expense', color: '#7c3aed' },
      { name: 'Travel', type: 'expense', color: '#059669' },
      { name: 'Groceries', type: 'expense', color: '#22c55e' },
      { name: 'Rent', type: 'expense', color: '#8b5cf6' },
      { name: 'Insurance', type: 'expense', color: '#0ea5e9' },
      { name: 'Fitness', type: 'expense', color: '#f59e0b' },
      { name: 'Personal Care', type: 'expense', color: '#ec4899' },
      { name: 'Home & Garden', type: 'expense', color: '#10b981' },
      { name: 'Subscriptions', type: 'expense', color: '#8b5cf6' },
      { name: 'Clothing', type: 'expense', color: '#f472b6' },
      { name: 'Electronics', type: 'expense', color: '#3b82f6' },
      { name: 'Gifts & Donations', type: 'expense', color: '#14b8a6' },
      { name: 'Taxes', type: 'expense', color: '#dc2626' },
      { name: 'Debt Payments', type: 'expense', color: '#991b1b' },
      { name: 'Other Expense', type: 'expense', color: '#374151' },
    ];

    // Check if default categories already exist
    const existingCategories = await Category.find({ 
      $or: [{ userId: { $exists: false } }, { userId: null }] 
    });
    
    if (existingCategories.length === 0) {
      // Create default categories without userId (global defaults)
      await Category.insertMany(defaultCategories);
      console.log('Default categories created successfully');
    }
    
  } catch (error) {
    console.log('Default categories already exist or error creating them:', error.message);
  }
};

export default connectDB;