import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name must be less than 50 characters'],
  },
  type: {
    type: String,
    required: [true, 'Category type is required'],
    enum: ['income', 'expense'],
  },
  color: {
    type: String,
    required: [true, 'Category color is required'],
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
    default: '#3b82f6',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique category name per type per user (for user categories)
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true, sparse: true });

// Index for default categories
categorySchema.index({ isDefault: 1, name: 1, type: 1 }, { unique: true, sparse: true });

export default mongoose.model('Category', categorySchema);