import express from 'express';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get comprehensive reports
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);
    
   
    // Default to current month if no dates provided
    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const end = endDate 
      ? new Date(endDate) 
      : new Date();

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

 

    // Get total income and expenses for the period
    const [totalIncomeResult, totalExpensesResult] = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
    ]);

    // Get expense breakdown by category
    const categoryData = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Get daily breakdown for trend analysis
    const dailyData = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' },
            },
            income: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' },
            },
            expenses: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ])
    ]);

    // Combine daily data
    const dailyIncomeMap = new Map();
    dailyData[0].forEach(item => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      dailyIncomeMap.set(key, item.income);
    });

    const dailyExpenseMap = new Map();
    dailyData[1].forEach(item => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      dailyExpenseMap.set(key, item.expenses);
    });

    // Create combined daily data
    const allDays = new Set([...dailyIncomeMap.keys(), ...dailyExpenseMap.keys()]);
    const dailyTrend = Array.from(allDays)
      .sort()
      .map(key => {
        const [year, month, day] = key.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        return {
          date: date.toISOString().split('T')[0],
          income: dailyIncomeMap.get(key) || 0,
          expenses: dailyExpenseMap.get(key) || 0,
          balance: (dailyIncomeMap.get(key) || 0) - (dailyExpenseMap.get(key) || 0),
        };
      });

    // Get monthly breakdown (last 6 months)
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [monthIncome, monthExpenses] = await Promise.all([
        Income.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
      ]);

      const income = monthIncome[0]?.total || 0;
      const expenses = monthExpenses[0]?.total || 0;

      monthlyData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income,
        expenses,
        balance: income - expenses,
      });
    }

    // Get all transactions for the period
    const [incomeTransactions, expenseTransactions] = await Promise.all([
      Income.find({
        userId: userId,
        date: { $gte: start, $lte: end },
      })
        .sort({ date: -1 })
        .lean(),
      
      Expense.find({
        userId: userId,
        date: { $gte: start, $lte: end },
      })
        .sort({ date: -1 })
        .lean(),
    ]);

    // Combine all transactions
    const allTransactions = [
      ...incomeTransactions.map(t => ({ ...t, type: 'income' })),
      ...expenseTransactions.map(t => ({ ...t, type: 'expense' })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get budget comparison for the period
    const budgetComparison = await Budget.find({
      userId: userId,
      year: { $in: [start.getFullYear(), end.getFullYear()] },
    }).lean();

    const totalIncome = totalIncomeResult[0]?.total || 0;
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    const totalExpensesAmount = totalExpenses;

    const reportData = {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeCount: totalIncomeResult[0]?.count || 0,
        expenseCount: totalExpensesResult[0]?.count || 0,
        totalTransactions: (totalIncomeResult[0]?.count || 0) + (totalExpensesResult[0]?.count || 0),
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0',
      },
      categoryData: categoryData.map(cat => ({
        name: cat._id,
        amount: cat.amount,
        count: cat.count,
        percentage: totalExpensesAmount 
          ? ((cat.amount / totalExpensesAmount) * 100).toFixed(1)
          : '0',
      })),
      monthlyData,
      dailyTrend,
      transactions: allTransactions,
      budgetComparison: budgetComparison.map(budget => ({
        category: budget.category,
        budgetAmount: budget.budgetAmount,
        spentAmount: budget.spentAmount,
        remaining: budget.budgetAmount - budget.spentAmount,
        percentage: budget.budgetAmount > 0 ? ((budget.spentAmount / budget.budgetAmount) * 100).toFixed(1) : '0',
        month: budget.month,
        year: budget.year,
      })),
    };

    console.log('Report data summary:', {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryCount: categoryData.length,
      transactionCount: allTransactions.length,
      monthlyDataPoints: monthlyData.length,
      dailyTrendPoints: dailyTrend.length
    });

    res.json(reportData);
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ message: 'Failed to generate reports', error: error.message });
  }
});

// Get income vs expenses trend
router.get('/trend', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();
    
    const trendData = [];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [monthIncome, monthExpenses] = await Promise.all([
        Income.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
      ]);

      const income = monthIncome[0]?.total || 0;
      const expenses = monthExpenses[0]?.total || 0;

      trendData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income,
        expenses,
        savings: income - expenses,
      });
    }

    res.json(trendData);
  } catch (error) {
    console.error('Trend error:', error);
    res.status(500).json({ message: 'Failed to fetch trend data', error: error.message });
  }
});

// Get category performance
router.get('/categories/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);
    
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use income or expense.' });
    }

    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const end = endDate 
      ? new Date(endDate) 
      : new Date();

    end.setHours(23, 59, 59, 999);

    const Model = type === 'income' ? Income : Expense;
    
    const categoryPerformance = await Model.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const totalAmount = categoryPerformance.reduce((sum, cat) => sum + cat.total, 0);

    const enrichedData = categoryPerformance.map(cat => ({
      category: cat._id,
      total: cat.total,
      count: cat.count,
      avgAmount: Math.round(cat.avgAmount * 100) / 100,
      maxAmount: cat.maxAmount,
      minAmount: cat.minAmount,
      percentage: totalAmount ? ((cat.total / totalAmount) * 100).toFixed(1) : '0',
    }));

    res.json({
      type,
      period: { startDate: start, endDate: end },
      totalAmount,
      categories: enrichedData,
    });
  } catch (error) {
    console.error('Category performance error:', error);
    res.status(500).json({ message: 'Failed to fetch category performance', error: error.message });
  }
});

export default router;