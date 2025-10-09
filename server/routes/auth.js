import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { 
  validateRegistration, 
  validateLogin, // This now imports our updated login validator
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Register route (No changes needed)
router.post('/register', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken',
      });
    }

    const user = new User({ username, email, password });
    await user.save();
    req.session.userId = user._id;

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// --- UPDATED LOGIN ROUTE HANDLER ---
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    // 1. Destructure 'identifier' from the request body.
    const { identifier, password } = req.body;

    // 2. Find the user where 'identifier' matches EITHER the email (case-insensitive) 
    //    OR the username (case-insensitive).
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: new RegExp('^' + identifier + '$', 'i') } // Case-insensitive exact match
      ],
    });

    // 3. Check if user exists. If not, send a 401 Unauthorized status.
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Check if the password is valid. If not, send a 401 status.
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 5. Create the session.
    req.session.userId = user._id;

    // 6. Send the success response.
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});
// --- END OF UPDATE ---

// Logout route (No changes needed)
router.post('/logout', (req, res) => {
  // ... (Your existing logout code is perfectly fine)
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          return res.json({ message: 'Logout completed with warnings' });
        }
        res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        res.json({ message: 'Logout successful' });
      });
    } else {
      res.json({ message: 'Already logged out' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Get current user route (No changes needed)
router.get('/me', requireAuth, async (req, res) => {
  // ... (Your existing /me code is perfectly fine)
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// All other routes like /profile, /password, /forgot-password are fine and do not need changes.
// ... (Your existing code for other routes)

// Just including the rest of your file for completeness...

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If an account with that email exists, we have sent a password reset link.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha265').update(resetToken).digest('hex');
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset token: ${resetToken}`);
    res.json({ 
      message: 'Password reset link has been sent to your email address.',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new password reset.' });
    }
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});


export default router;