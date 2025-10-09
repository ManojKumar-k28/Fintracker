import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import mongoose from 'mongoose';

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find admin user
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials or not an admin' 
      });
    }

    // Check if admin is active
    if (admin.status === 'inactive') {
      return res.status(401).json({ 
        success: false,
        message: 'Admin account is inactive' 
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        role: admin.role,
        email: admin.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during admin login' 
    });
  }
};

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      role = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status and role
    if (status) query.status = status;
    if (role) query.role = role;

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        stats: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          regularUsers: 0
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users' 
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role. Must be user or admin' 
      });
    }

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change your own role' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user role' 
    });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be active or inactive' 
      });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && status === 'inactive') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot deactivate your own account' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user status' 
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete your own account' 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete user's data in transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete user's financial data
      await Promise.all([
        Income.deleteMany({ userId: id }).session(session),
        Expense.deleteMany({ userId: id }).session(session),
        Budget.deleteMany({ userId: id }).session(session),
        Category.deleteMany({ userId: id }).session(session)
      ]);

      // Delete the user
      await User.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
      
      res.json({ 
        success: true,
        message: 'User and associated data deleted successfully' 
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete user' 
    });
  }
};

// Get all default categories
export const getAllCategories = async (req, res) => {
  try {
    const { type = '', search = '' } = req.query;
    
    const query = { isDefault: true };
    
    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(query)
      .populate('createdBy', 'name email')
      .sort({ type: 1, name: 1 });

    // Get category usage statistics
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const [incomeCount, expenseCount] = await Promise.all([
          Income.countDocuments({ categoryId: category._id }),
          Expense.countDocuments({ categoryId: category._id })
        ]);
        
        return {
          ...category.toObject(),
          usage: {
            incomeTransactions: incomeCount,
            expenseTransactions: expenseCount,
            totalTransactions: incomeCount + expenseCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        categories: categoryStats,
        total: categories.length
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch categories' 
    });
  }
};

// Create default category
export const createCategory = async (req, res) => {
  try {
    const { name, type, color } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      isDefault: true,
    });

    if (existingCategory) {
      return res.status(400).json({ 
        success: false,
        message: 'Default category already exists' 
      });
    }

    const category = new Category({
      name: name.trim(),
      type,
      color: color || '#3b82f6',
      isDefault: true,
      createdBy: req.user.id
    });

    await category.save();
    
    const populatedCategory = await Category.findById(category._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category: populatedCategory }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create category' 
    });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color } = req.body;

    // Check if another category with same name and type exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      isDefault: true,
      _id: { $ne: id }
    });

    if (existingCategory) {
      return res.status(400).json({ 
        success: false,
        message: 'Another category with this name and type already exists' 
      });
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, isDefault: true },
      { 
        name: name.trim(), 
        type, 
        color: color || '#3b82f6' 
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Default category not found' 
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update category' 
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is being used
    const [incomeCount, expenseCount] = await Promise.all([
      Income.countDocuments({ categoryId: id }),
      Expense.countDocuments({ categoryId: id }),
    ]);

    if (incomeCount > 0 || expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used in ${incomeCount + expenseCount} transactions.`,
        data: {
          incomeTransactions: incomeCount,
          expenseTransactions: expenseCount,
          totalTransactions: incomeCount + expenseCount
        }
      });
    }

    const category = await Category.findOneAndDelete({ 
      _id: id, 
      isDefault: true 
    });
    
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Default category not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Category deleted successfully' 
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete category' 
    });
  }
};

// System reports
export const getSystemReports = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Get total income and expenses
    const [totalIncomeResult, totalExpensesResult] = await Promise.all([
      Income.aggregate([
        { $match: matchStage },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          } 
        },
      ]),
      Expense.aggregate([
        { $match: matchStage },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          } 
        },
      ]),
    ]);

    const totalIncome = totalIncomeResult[0]?.total || 0;
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    const totalRevenues = totalIncome - totalExpenses;

    // Monthly/Yearly trends based on groupBy parameter
    const groupStage = groupBy === 'year' 
      ? { year: { $year: '$date' } }
      : { 
          year: { $year: '$date' }, 
          month: { $month: '$date' } 
        };

    const [incomeTrends, expenseTrends] = await Promise.all([
      Income.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupStage,
            income: { $sum: '$amount' },
            count: { $sum: 1 }
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Expense.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupStage,
            expenses: { $sum: '$amount' },
            count: { $sum: 1 }
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    // Most used categories with detailed stats
    const mostUsedCategories = await Expense.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$categoryId',
          name: { $first: '$category.name' },
          type: { $first: '$category.type' },
          color: { $first: '$category.color' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' }
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Top spending users
    const topSpendingUsers = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          transactionCount: 1,
          userName: '$user.name',
          userEmail: '$user.email'
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          totalRevenues,
          profitMargin: totalIncome > 0 ? ((totalRevenues / totalIncome) * 100).toFixed(2) : '0',
          incomeStats: totalIncomeResult[0] || { total: 0, count: 0, avgAmount: 0 },
          expenseStats: totalExpensesResult[0] || { total: 0, count: 0, avgAmount: 0 }
        },
        trends: {
          income: incomeTrends,
          expenses: expenseTrends,
          groupBy
        },
        mostUsedCategories,
        topSpendingUsers,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time'
        }
      }
    });
  } catch (error) {
    console.error('System reports error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate system reports' 
    });
  }
};

// Admin dashboard
export const getAdminDashboard = async (req, res) => {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get financial overview
    const [totalIncomeResult, totalExpensesResult] = await Promise.all([
      Income.aggregate([{ 
        $group: { 
          _id: null, 
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        } 
      }]),
      Expense.aggregate([{ 
        $group: { 
          _id: null, 
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        } 
      }]),
    ]);

    const totalIncome = totalIncomeResult[0]?.total || 0;
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    const totalRevenues = totalIncome - totalExpenses;

    // Most used categories
    const mostUsedCategories = await Expense.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$categoryId',
          name: { $first: '$category.name' },
          type: { $first: '$category.type' },
          color: { $first: '$category.color' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Default categories
    const defaultCategories = await Category.find({ isDefault: true })
      .populate('createdBy', 'name email')
      .sort({ type: 1, name: 1 });

    // Recent activity (last 10 transactions)
    const [recentIncome, recentExpenses] = await Promise.all([
      Income.find()
        .populate('userId', 'name email')
        .populate('categoryId', 'name color')
        .sort({ createdAt: -1 })
        .limit(5),
      Expense.find()
        .populate('userId', 'name email')
        .populate('categoryId', 'name color')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const recentActivity = [
      ...recentIncome.map(item => ({ ...item.toObject(), type: 'income' })),
      ...recentExpenses.map(item => ({ ...item.toObject(), type: 'expense' }))
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Monthly growth (last 6 months)
    const monthlyGrowth = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [monthIncome, monthExpenses, newUsers] = await Promise.all([
        Income.aggregate([
          {
            $match: {
              date: { $gte: monthStart, $lte: monthEnd }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          {
            $match: {
              date: { $gte: monthStart, $lte: monthEnd }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        User.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        })
      ]);

      monthlyGrowth.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: monthIncome[0]?.total || 0,
        expenses: monthExpenses[0]?.total || 0,
        newUsers
      });
    }

    res.json({
      success: true,
      data: {
        userStats: userStats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          regularUsers: 0
        },
        financialOverview: {
          totalIncome,
          totalExpenses,
          totalRevenues,
          profitMargin: totalIncome > 0 ? ((totalRevenues / totalIncome) * 100).toFixed(2) : '0',
          incomeStats: totalIncomeResult[0] || { total: 0, count: 0, avgAmount: 0 },
          expenseStats: totalExpensesResult[0] || { total: 0, count: 0, avgAmount: 0 }
        },
        mostUsedCategories,
        defaultCategories: {
          categories: defaultCategories,
          total: defaultCategories.length
        },
        recentActivity,
        monthlyGrowth
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch admin dashboard data' 
    });
  }
};