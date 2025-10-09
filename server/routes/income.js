import express from 'express';
import Income from '../models/Income.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import { validateTransaction, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get all income for user
router.get('/', async (req, res) => {
  try {
    const income = await Income.find({ userId: req.userId })
      .sort({ date: -1 });
    
    res.json(income);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ message: 'Failed to fetch income' });
  }
});

// Get income by ID
router.get('/:id', async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    res.json(income);
  } catch (error) {
    console.error('Get income by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch income' });
  }
});

// Create new income
router.post('/', validateTransaction, handleValidationErrors, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;

    const income = new Income({
      userId: req.userId,
      description,
      amount: parseFloat(amount),
      category,
      date: new Date(date),
    });

    await income.save();
    res.status(201).json(income);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ message: 'Failed to create income' });
  }
});

// Update income
router.put('/:id', validateTransaction, handleValidationErrors, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;

    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
      },
      { new: true, runValidators: true }
    );

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    res.json(income);
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ message: 'Failed to update income' });
  }
});

// Delete income
router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ message: 'Failed to delete income' });
  }
});

// Get income statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = { userId: req.userId };
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amount' },
          count: { $sum: 1 },
          averageIncome: { $avg: '$amount' },
        },
      },
    ]);

    const categoryStats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      summary: stats[0] || { totalIncome: 0, count: 0, averageIncome: 0 },
      byCategory: categoryStats,
    });
  } catch (error) {
    console.error('Get income stats error:', error);
    res.status(500).json({ message: 'Failed to fetch income statistics' });
  }
});

export default router;