import express from 'express';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import { requireAuth, getUser } from '../middleware/auth.js';
import { validateBudget, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.use(requireAuth, getUser);

// Helper to get month index from name
const getMonthIndex = (monthName) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);

// Helper to get date range for a budget
const getBudgetPeriod = (budget) => {
    if (budget.periodType === 'Annual') {
        const startDate = new Date(budget.year, 0, 1); // Jan 1st
        const endDate = new Date(budget.year, 11, 31, 23, 59, 59); // Dec 31st
        return { startDate, endDate };
    }
    // Default to monthly
    const monthIndex = getMonthIndex(budget.month);
    const startDate = new Date(budget.year, monthIndex, 1);
    const endDate = new Date(budget.year, monthIndex + 1, 0, 23, 59, 59); // Last day of the month
    return { startDate, endDate };
};

// GET all budgets for user
router.get('/', async (req, res) => {
    try {
        // Fetch all budgets and sort by year, then by period type
        const budgets = await Budget.find({ userId: req.userId }).sort({ year: -1, periodType: -1 });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch budgets' });
    }
});

// CREATE new budget (Monthly or Annual)
router.post('/', validateBudget, handleValidationErrors, async (req, res) => {
    try {
        const { category, budgetAmount, month, year, periodType } = req.body;

        const newBudgetData = {
            userId: req.userId,
            category,
            budgetAmount: parseFloat(budgetAmount),
            periodType,
            year: parseInt(year),
            month: periodType === 'Monthly' ? month : null,
        };

        // Calculate spent amount for the period
        const { startDate, endDate } = getBudgetPeriod(newBudgetData);
        const spentResult = await Expense.aggregate([
            { $match: { userId: req.userId, category, date: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        newBudgetData.spentAmount = spentResult[0]?.total || 0;

        const budget = new Budget(newBudgetData);
        await budget.save();
        res.status(201).json(budget);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A budget for this category and period already exists.' });
        }
        res.status(500).json({ message: 'Failed to create budget', error: error.message });
    }
});

// UPDATE budget
router.put('/:id', validateBudget, handleValidationErrors, async (req, res) => {
    try {
        const { category, budgetAmount, month, year, periodType } = req.body;

        const updateData = {
            category,
            budgetAmount: parseFloat(budgetAmount),
            periodType,
            year: parseInt(year),
            month: periodType === 'Monthly' ? month : null,
        };
        
        const budget = await Budget.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!budget) return res.status(404).json({ message: 'Budget not found' });

        // Recalculate spent amount after update
        const { startDate, endDate } = getBudgetPeriod(budget);
        const spentResult = await Expense.aggregate([
            { $match: { userId: req.userId, category: budget.category, date: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        budget.spentAmount = spentResult[0]?.total || 0;
        await budget.save();

        res.json(budget);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A budget for this category and period already exists.' });
        }
        res.status(500).json({ message: 'Failed to update budget' });
    }
});


// DELETE budget
router.delete('/:id', async (req, res) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });
        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete budget' });
    }
});

// REFRESH all budget spent amounts
router.post('/refresh', async (req, res) => {
    try {
        const budgets = await Budget.find({ userId: req.userId });
        for (const budget of budgets) {
            const { startDate, endDate } = getBudgetPeriod(budget);
            const spentResult = await Expense.aggregate([
                { $match: { userId: req.userId, category: budget.category, date: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);
            budget.spentAmount = spentResult[0]?.total || 0;
            await budget.save();
        }
        res.json({ message: 'Budget amounts refreshed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to refresh budget amounts' });
    }
});

export default router;