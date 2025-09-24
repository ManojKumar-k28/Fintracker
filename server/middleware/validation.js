import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

export const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character')
];

export const validateLogin = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // Custom check for either username or email
  body().custom((_, { req }) => {
    if (!req.body.username && !req.body.email) {
      throw new Error('Username or email is required');
    }
    return true;
  }),
];
export const validateTransaction = [
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters'),
  
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom(value => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  
  body('date')
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const validateBudget = [
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  
  body('budgetAmount')
    .isNumeric()
    .withMessage('Budget amount must be a number')
    .custom(value => {
      if (parseFloat(value) <= 0) {
        throw new Error('Budget amount must be greater than 0');
      }
      return true;
    }),
  
  body('month')
    .isIn([
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ])
    .withMessage('Invalid month'),
  
  body('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030'),
];

export const validateCategory = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Category name must be less than 50 characters'),
  
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Category type must be either income or expense'),
  
  body('color')
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color'),
];