import express from 'express';
import Category from '../models/Category.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import { validateCategory, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get all categories for user (including defaults)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching categories for user:', req.userId);
    
    // Get user-specific categories
    const userCategories = await Category.find({ userId: req.userId });
    console.log('User categories found:', userCategories.length);
    
    // Get default categories (where userId doesn't exist)
    const defaultCategories = await Category.find({ 
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });
    console.log('Default categories found:', defaultCategories.length);
    
    // Combine categories, user categories override defaults with same name and type
    const allCategories = [...userCategories];
    
    defaultCategories.forEach(defaultCat => {
      const hasUserOverride = userCategories.some(userCat => 
        userCat.name === defaultCat.name && userCat.type === defaultCat.type
      );
      if (!hasUserOverride) {
        allCategories.push({
          ...defaultCat.toObject(),
          _id: defaultCat._id,
          isDefault: true
        });
      }
    });
    
    // Sort categories by type and name
    const sortedCategories = allCategories.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    console.log('Total categories returned:', sortedCategories.length);
    res.json(sortedCategories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Get categories by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    console.log('Fetching categories by type:', type, 'for user:', req.userId);
    
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Invalid category type' });
    }

    // Get user categories and default categories of the specified type
    const [userCategories, defaultCategories] = await Promise.all([
      Category.find({ userId: req.userId, type }).sort({ name: 1 }),
      Category.find({ 
        $or: [{ userId: { $exists: false } }, { userId: null }],
        type 
      }).sort({ name: 1 })
    ]);

    console.log(`User ${type} categories:`, userCategories.length);
    console.log(`Default ${type} categories:`, defaultCategories.length);

    // Combine categories
    const allCategories = [...userCategories];
    defaultCategories.forEach(defaultCat => {
      const hasUserOverride = userCategories.some(userCat => 
        userCat.name === defaultCat.name
      );
      if (!hasUserOverride) {
        allCategories.push({
          ...defaultCat.toObject(),
          isDefault: true
        });
      }
    });
    
    console.log(`Total ${type} categories returned:`, allCategories.length);
    res.json(allCategories);
  } catch (error) {
    console.error('Get categories by type error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/', validateCategory, handleValidationErrors, async (req, res) => {
  try {
    const { name, type, color } = req.body;

    // Check if category already exists for this user and type
    const existingCategory = await Category.findOne({
      userId: req.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
    });

    if (existingCategory) {
      return res.status(400).json({
        message: `${type} category '${name}' already exists`,
      });
    }

    const category = new Category({
      userId: req.userId,
      name: name.trim(),
      type,
      color,
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create category' });
    }
  }
});

// Update category
router.put('/:id', validateCategory, handleValidationErrors, async (req, res) => {
  try {
    const { name, type, color } = req.body;

    // Check if another category with the same name and type exists
    const existingCategory = await Category.findOne({
      userId: req.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(400).json({
        message: `${type} category '${name}' already exists`,
      });
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        name: name.trim(),
        type,
        color,
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Failed to update category' });
    }
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

export default router;