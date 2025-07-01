import { Router } from 'express';
import passport from './auth.js';
import { storage } from './storage.js';
import { hashPassword, validatePassword, validateEmail, requireAuth, requireNoAuth } from './auth.js';
import { insertUserSchema } from '../shared/schema.js';
import { z } from 'zod';

const router = Router();

// Register route
router.post('/register', requireNoAuth, async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Basic validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Email, password, and password confirmation are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Passwords do not match' 
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors 
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUser = await storage.createUser({
      email,
      passwordHash
    });

    // Log the user in automatically after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error('Login error after registration:', err);
        return res.status(500).json({ message: 'Registration successful but login failed' });
      }
      
      // Return user data without password hash
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ 
        message: 'Registration successful',
        user: userWithoutPassword 
      });
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
router.post('/login', requireNoAuth, (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: info?.message || 'Invalid credentials' 
      });
    }

    req.login(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Login failed' });
      }
      
      // Return user data without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ 
        message: 'Login successful',
        user: userWithoutPassword 
      });
    });
  })(req, res, next);
});

// Logout route
router.post('/logout', requireAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user profile
router.get('/profile', requireAuth, (req, res) => {
  const user = req.user as any;
  const { passwordHash: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({ message: 'Email is already taken' });
    }

    // Update user
    const updatedUser = await storage.updateUser(user.id, { email });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    res.json({ 
      message: 'Profile updated successfully',
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ 
        message: 'Current password, new password, and confirmation are required' 
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ 
        message: 'New passwords do not match' 
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors 
      });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await storage.updateUser(user.id, { passwordHash: newPasswordHash });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ 
      authenticated: true,
      user: userWithoutPassword 
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router; 