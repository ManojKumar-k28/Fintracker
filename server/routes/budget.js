import express from 'express';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import { validateBudget, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get all budgets for user
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId })
      .sort({ year: -1, month: 1 });
    
    res.json(budgets);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ message: 'Failed to fetch budgets' });
  }
});

// Get budget by ID
router.get('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Get budget by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch budget' });
  }
});

// Create new budget
router.post('/', validateBudget, handleValidationErrors, async (req, res) => {
  try {
    const { category, budgetAmount, month, year } = req.body;

    // Check if budget already exists for this category, month, and year
    const existingBudget = await Budget.findOne({
      userId: req.userId,
      category,
      month,
      year: parseInt(year),
    });

    if (existingBudget) {
      return res.status(400).json({
        message: `Budget already exists for ${category} in ${month} ${year}`,
      });
    }

    // Calculate spent amount for this category in the specified month/year
    const startDate = new Date(year, getMonthIndex(month), 1);
    const endDate = new Date(year, getMonthIndex(month) + 1, 0);

    const spentAmount = await Expense.aggregate([
      {
        $match: {
          userId: req.userId,
          category,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const budget = new Budget({
      userId: req.userId,
      category,
      budgetAmount: parseFloat(budgetAmount),
      spentAmount: spentAmount[0]?.total || 0,
      month,
      year: parseInt(year),
    });

    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    console.error('Create budget error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Budget already exists for this category and period' });
    } else {
      res.status(500).json({ message: 'Failed to create budget' });
    }
  }
});

// Update budget
router.put('/:id', validateBudget, handleValidationErrors, async (req, res) => {
  try {
    const { category, budgetAmount, month, year } = req.body;

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        category,
        budgetAmount: parseFloat(budgetAmount),
        month,
        year: parseInt(year),
      },
      { new: true, runValidators: true }
    );

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Recalculate spent amount
    const startDate = new Date(year, getMonthIndex(month), 1);
    const endDate = new Date(year, getMonthIndex(month) + 1, 0);

    const spentAmount = await Expense.aggregate([
      {
        $match: {
          userId: req.userId,
          category,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    budget.spentAmount = spentAmount[0]?.total || 0;
    await budget.save();

    res.json(budget);
  } catch (error) {
    console.error('Update budget error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Budget already exists for this category and period' });
    } else {
      res.status(500).json({ message: 'Failed to update budget' });
    }
  }
});

// Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ message: 'Failed to delete budget' });
  }
});

// Refresh budget spent amounts
router.post('/refresh', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId });

    for (const budget of budgets) {
      const startDate = new Date(budget.year, getMonthIndex(budget.month), 1);
      const endDate = new Date(budget.year, getMonthIndex(budget.month) + 1, 0);

      const spentAmount = await Expense.aggregate([
        {
          $match: {
            userId: req.userId,
            category: budget.category,
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      budget.spentAmount = spentAmount[0]?.total || 0;
      await budget.save();
    }

    res.json({ message: 'Budget amounts refreshed successfully' });
  } catch (error) {
    console.error('Refresh budgets error:', error);
    res.status(500).json({ message: 'Failed to refresh budget amounts' });
  }
});

// Helper function to get month index
function getMonthIndex(monthName) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(monthName);
}

export default router;