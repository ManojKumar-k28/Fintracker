import express from 'express';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth, getUser);

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);
    
    
    
    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

   

    // Ensure we have valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get total income for the period
    const incomeResult = await Income.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total expenses for the period
    const expenseResult = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total budget for current month
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    const budgetResult = await Budget.aggregate([
      {
        $match: {
          userId: userId,
          month: currentMonth,
          year: currentYear,
        },
      },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$budgetAmount' },
          totalSpent: { $sum: '$spentAmount' },
        },
      },
    ]);

    // Get recent transactions (last 10)
    const [recentIncome, recentExpenses] = await Promise.all([
      Income.find({ userId: userId })
        .sort({ date: -1 })
        .limit(5)
        .lean(),
      Expense.find({ userId: userId })
        .sort({ date: -1 })
        .limit(5)
        .lean()
    ]);

    // Combine and sort recent transactions
    const recentTransactions = [
      ...recentIncome.map(item => ({ ...item, type: 'income' })),
      ...recentExpenses.map(item => ({ ...item, type: 'expense' })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Get expense breakdown by category for the period
    const categoryData = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startDate, $lte: endDate },
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
      { $limit: 10 },
    ]);

    // Generate monthly data for charts (last 6 months)
    const monthlyData = [];
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
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ])
      ]);

      monthlyData.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        income: monthIncome[0]?.total || 0,
        expenses: monthExpenses[0]?.total || 0,
      });
    }

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;
    const totalBudget = budgetResult[0]?.totalBudget || 0;

    const dashboardData = {
      totalIncome,
      totalExpenses,
      totalBudget,
      balance: totalIncome - totalExpenses,
      recentTransactions,
      categoryData: categoryData.map(cat => ({
        name: cat._id,
        amount: cat.amount,
        count: cat.count,
      })),
      monthlyData,
      period,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };



    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: error.message });
  }
});

// Get financial summary with comparisons
router.get('/summary', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();
    
    // Current month data
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Previous month data
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Current month totals
    const [currentIncome, currentExpenses] = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
    ]);

    // Previous month totals
    const [previousIncome, previousExpenses] = await Promise.all([
      Income.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId: userId,
            date: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
    ]);

    const currentIncomeTotal = currentIncome[0]?.total || 0;
    const currentExpensesTotal = currentExpenses[0]?.total || 0;
    const previousIncomeTotal = previousIncome[0]?.total || 0;
    const previousExpensesTotal = previousExpenses[0]?.total || 0;

    // Calculate percentage changes
    const incomeChange = previousIncomeTotal 
      ? ((currentIncomeTotal - previousIncomeTotal) / previousIncomeTotal) * 100 
      : 0;
      
    const expenseChange = previousExpensesTotal 
      ? ((currentExpensesTotal - previousExpensesTotal) / previousExpensesTotal) * 100 
      : 0;

    res.json({
      currentMonth: {
        income: currentIncomeTotal,
        expenses: currentExpensesTotal,
        balance: currentIncomeTotal - currentExpensesTotal,
      },
      previousMonth: {
        income: previousIncomeTotal,
        expenses: previousExpensesTotal,
        balance: previousIncomeTotal - previousExpensesTotal,
      },
      changes: {
        income: Math.round(incomeChange * 100) / 100,
        expenses: Math.round(expenseChange * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary data' });
  }
});

export default router;