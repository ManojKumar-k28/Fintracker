import express from 'express';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import { validateTransaction, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get all expenses for user
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId })
      .sort({ date: -1 });
    
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get expense by ID
router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

// Create new expense
router.post('/', validateTransaction, handleValidationErrors, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const expenseAmount = parseFloat(amount);
    const expenseDate = new Date(date);

    const expense = new Expense({
      userId: req.userId,
      description,
      amount: expenseAmount,
      category,
      date: expenseDate,
    });

    await expense.save();

    // Update budget spent amount if budget exists
    const expenseMonth = expenseDate.toLocaleString('default', { month: 'long' });
    const expenseYear = expenseDate.getFullYear();

    await Budget.findOneAndUpdate(
      {
        userId: req.userId,
        category,
        month: expenseMonth,
        year: expenseYear,
      },
      { $inc: { spentAmount: expenseAmount } }
    );

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', validateTransaction, handleValidationErrors, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const newAmount = parseFloat(amount);
    const newDate = new Date(date);

    // Get the old expense to calculate budget difference
    const oldExpense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!oldExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        description,
        amount: newAmount,
        category,
        date: newDate,
      },
      { new: true, runValidators: true }
    );

    // Update budget spent amounts
    if (oldExpense.category === category) {
      // Same category, just update the difference
      const amountDifference = newAmount - oldExpense.amount;
      const expenseMonth = newDate.toLocaleString('default', { month: 'long' });
      const expenseYear = newDate.getFullYear();

      await Budget.findOneAndUpdate(
        {
          userId: req.userId,
          category,
          month: expenseMonth,
          year: expenseYear,
        },
        { $inc: { spentAmount: amountDifference } }
      );
    } else {
      // Different category, subtract from old and add to new
      const oldMonth = oldExpense.date.toLocaleString('default', { month: 'long' });
      const oldYear = oldExpense.date.getFullYear();
      const newMonth = newDate.toLocaleString('default', { month: 'long' });
      const newYear = newDate.getFullYear();

      // Subtract from old budget
      await Budget.findOneAndUpdate(
        {
          userId: req.userId,
          category: oldExpense.category,
          month: oldMonth,
          year: oldYear,
        },
        { $inc: { spentAmount: -oldExpense.amount } }
      );

      // Add to new budget
      await Budget.findOneAndUpdate(
        {
          userId: req.userId,
          category,
          month: newMonth,
          year: newYear,
        },
        { $inc: { spentAmount: newAmount } }
      );
    }

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Update budget spent amount
    const expenseMonth = expense.date.toLocaleString('default', { month: 'long' });
    const expenseYear = expense.date.getFullYear();

    await Budget.findOneAndUpdate(
      {
        userId: req.userId,
        category: expense.category,
        month: expenseMonth,
        year: expenseYear,
      },
      { $inc: { spentAmount: -expense.amount } }
    );

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// Get expense statistics
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

    const stats = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 },
          averageExpense: { $avg: '$amount' },
        },
      },
    ]);

    const categoryStats = await Expense.aggregate([
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
      summary: stats[0] || { totalExpenses: 0, count: 0, averageExpense: 0 },
      byCategory: categoryStats,
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ message: 'Failed to fetch expense statistics' });
  }
});

export default router;