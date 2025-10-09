import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 second
    };

    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintracker';
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`💾 Database: ${conn.connection.name}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Create indexes for better performance
    await createIndexes();
    
    // Create default data
    await createDefaultCategories();
    await createDefaultAdmin();
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.error('Stack trace:', error.stack);
    
    // Retry connection after 5 seconds
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

const createIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes...');
    
    // User indexes
    await mongoose.connection.collection('users').createIndex({ username: 1 }, { unique: true });
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.collection('users').createIndex({ role: 1 });
    await mongoose.connection.collection('users').createIndex({ status: 1 });
    await mongoose.connection.collection('users').createIndex({ createdAt: -1 });
    
    // Income indexes
    await mongoose.connection.collection('incomes').createIndex({ userId: 1, date: -1 });
    await mongoose.connection.collection('incomes').createIndex({ userId: 1, categoryId: 1 });
    await mongoose.connection.collection('incomes').createIndex({ date: -1 });
    
    // Expense indexes
    await mongoose.connection.collection('expenses').createIndex({ userId: 1, date: -1 });
    await mongoose.connection.collection('expenses').createIndex({ userId: 1, categoryId: 1 });
    await mongoose.connection.collection('expenses').createIndex({ date: -1 });
    
    // Budget indexes
    await mongoose.connection.collection('budgets').createIndex({ userId: 1, month: 1, year: 1 });
    await mongoose.connection.collection('budgets').createIndex({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });
    
    // Category indexes
    await mongoose.connection.collection('categories').createIndex({ userId: 1, name: 1, type: 1 }, { unique: true, sparse: true });
    await mongoose.connection.collection('categories').createIndex({ isDefault: 1, name: 1, type: 1 }, { unique: true, sparse: true });
    await mongoose.connection.collection('categories').createIndex({ type: 1 });
    await mongoose.connection.collection('categories').createIndex({ isDefault: 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.log('⚠️ Some indexes already exist or error creating indexes:', error.message);
  }
};

const createDefaultCategories = async () => {
  try {
    console.log('🏷️ Creating default categories...');
    
    // Import Category model dynamically to avoid circular dependency
    const { default: Category } = await import('../models/Category.js');
    
    const defaultCategories = [
      // Income Categories
      { name: 'Salary', type: 'income', color: '#10b981', isDefault: true },
      { name: 'Freelance', type: 'income', color: '#3b82f6', isDefault: true },
      { name: 'Business', type: 'income', color: '#8b5cf6', isDefault: true },
      { name: 'Investment', type: 'income', color: '#f59e0b', isDefault: true },
      { name: 'Rental Income', type: 'income', color: '#06b6d4', isDefault: true },
      { name: 'Bonus', type: 'income', color: '#84cc16', isDefault: true },
      { name: 'Commission', type: 'income', color: '#f97316', isDefault: true },
      { name: 'Gift', type: 'income', color: '#ec4899', isDefault: true },
      { name: 'Dividends', type: 'income', color: '#6366f1', isDefault: true },
      { name: 'Side Hustle', type: 'income', color: '#14b8a6', isDefault: true },
      { name: 'Refunds', type: 'income', color: '#f472b6', isDefault: true },
      { name: 'Other Income', type: 'income', color: '#64748b', isDefault: true },
      
      // Expense Categories
      { name: 'Food & Dining', type: 'expense', color: '#ef4444', isDefault: true },
      { name: 'Transportation', type: 'expense', color: '#06b6d4', isDefault: true },
      { name: 'Shopping', type: 'expense', color: '#84cc16', isDefault: true },
      { name: 'Entertainment', type: 'expense', color: '#f97316', isDefault: true },
      { name: 'Bills & Utilities', type: 'expense', color: '#64748b', isDefault: true },
      { name: 'Healthcare', type: 'expense', color: '#dc2626', isDefault: true },
      { name: 'Education', type: 'expense', color: '#7c3aed', isDefault: true },
      { name: 'Travel', type: 'expense', color: '#059669', isDefault: true },
      { name: 'Groceries', type: 'expense', color: '#22c55e', isDefault: true },
      { name: 'Rent', type: 'expense', color: '#8b5cf6', isDefault: true },
      { name: 'Insurance', type: 'expense', color: '#0ea5e9', isDefault: true },
      { name: 'Fitness', type: 'expense', color: '#f59e0b', isDefault: true },
      { name: 'Personal Care', type: 'expense', color: '#ec4899', isDefault: true },
      { name: 'Home & Garden', type: 'expense', color: '#10b981', isDefault: true },
      { name: 'Subscriptions', type: 'expense', color: '#8b5cf6', isDefault: true },
      { name: 'Clothing', type: 'expense', color: '#f472b6', isDefault: true },
      { name: 'Electronics', type: 'expense', color: '#3b82f6', isDefault: true },
      { name: 'Gifts & Donations', type: 'expense', color: '#14b8a6', isDefault: true },
      { name: 'Taxes', type: 'expense', color: '#dc2626', isDefault: true },
      { name: 'Debt Payments', type: 'expense', color: '#991b1b', isDefault: true },
      { name: 'Other Expense', type: 'expense', color: '#374151', isDefault: true },
    ];

    // Check if default categories already exist
    const existingCategories = await Category.find({ isDefault: true });
    
    if (existingCategories.length === 0) {
      await Category.insertMany(defaultCategories);
      console.log('✅ Default categories created successfully');
    } else {
      console.log('ℹ️ Default categories already exist');
    }
    
  } catch (error) {
    console.log('⚠️ Error with default categories:', error.message);
  }
};

const createDefaultAdmin = async () => {
  try {
    console.log('👤 Creating default admin...');
    
    // Import User model dynamically to avoid circular dependency
    const { default: User } = await import('../models/User.js');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: 'admin@financetracker.com',
      role: 'admin'
    });
    
    if (!existingAdmin) {
      const admin = new User({
        name: 'System Admin',
        username: 'admin',
        email: 'admin@financetracker.com',
        password: 'Admin@123', // Will be hashed by pre-save middleware
        role: 'admin',
        status: 'active',
      });
      
      await admin.save();
      console.log('✅ Default admin created successfully');
      console.log('🔐 Admin credentials:');
      console.log('   Email: admin@financetracker.com');
      console.log('   Password: Admin@123');
      console.log('   Username: admin');
    } else {
      console.log('ℹ️ Default admin already exists');
    }
    
  } catch (error) {
    console.log('⚠️ Error with default admin:', error.message);
  }
};

export default connectDB;