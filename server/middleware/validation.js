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
    .isLength({ min: 3, max: 30 }) // Corrected min length to match message
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// --- UPDATED LOGIN VALIDATION ---
// We now validate a single 'identifier' field instead of 'username'.
// This aligns with the payload our React frontend is sending.
export const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];
// --- END OF UPDATE ---

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