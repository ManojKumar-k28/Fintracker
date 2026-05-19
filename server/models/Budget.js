import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  budgetAmount: {
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [0.01, 'Budget amount must be greater than 0'],
  },
  spentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative'],
  },
  periodType: {
    type: String,
    required: true,
    enum: ['Monthly', 'Annual'],
    default: 'Monthly',
  },
  month: {
    type: String,
    // Month is now optional, only required if periodType is 'Monthly'
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December', null
    ],
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year must be 2020 or later'],
  },
}, {
  timestamps: true,
});

// Custom validator to ensure month is present for Monthly budgets
budgetSchema.pre('validate', function(next) {
  if (this.periodType === 'Monthly' && !this.month) {
    this.invalidate('month', 'Month is required for a monthly budget.');
  }
  if (this.periodType === 'Annual') {
    this.month = null; // Ensure month is null for annual budgets
  }
  next();
});


// Partial index for unique MONTHLY budgets per user/category
budgetSchema.index(
  { userId: 1, category: 1, month: 1, year: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { periodType: 'Monthly' } 
  }
);

// Partial index for unique ANNUAL budgets per user/category
budgetSchema.index(
  { userId: 1, category: 1, year: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { periodType: 'Annual' } 
  }
);


export default mongoose.model('Budget', budgetSchema);