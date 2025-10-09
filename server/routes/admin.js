import express from 'express';
import {
  adminLogin,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSystemReports,
  getAdminDashboard,
} from '../controllers/adminController.js';
import { auth, isAdmin } from '../middleware/adminAuth.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Admin login (no auth required)
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
], adminLogin);

// Health check for admin routes (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Apply auth and admin middleware to all routes below
router.use(auth, isAdmin);

// User Management Routes
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  query('sortBy').optional().isIn(['name', 'email', 'createdAt', 'status', 'role']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
], getAllUsers);

router.patch('/users/:id/role', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  handleValidationErrors,
], updateUserRole);

router.patch('/users/:id/status', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  handleValidationErrors,
], updateUserStatus);

router.delete('/users/:id', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  handleValidationErrors,
], deleteUser);

// Category Management Routes
router.get('/categories', [
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  query('search').optional().isString().withMessage('Search must be a string'),
  handleValidationErrors,
], getAllCategories);

router.post('/categories', [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name is required and must be between 1-50 characters'),
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color'),
  handleValidationErrors,
], createCategory);

router.patch('/categories/:id', [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name is required and must be between 1-50 characters'),
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color'),
  handleValidationErrors,
], updateCategory);

router.delete('/categories/:id', [
  param('id').isMongoId().withMessage('Invalid category ID'),
  handleValidationErrors,
], deleteCategory);

// Reports and Dashboard Routes
router.get('/reports/system', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('groupBy').optional().isIn(['month', 'year']).withMessage('Group by must be month or year'),
  handleValidationErrors,
], getSystemReports);

router.get('/dashboard', getAdminDashboard);

// Authenticated health check
router.get('/auth-health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is healthy and authenticated',
    timestamp: new Date().toISOString(),
    admin: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

export default router;