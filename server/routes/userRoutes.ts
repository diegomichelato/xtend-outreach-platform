import { Router } from 'express';
import { AuthService } from '../services/auth';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { UserRole } from '@shared/schema';

const router = Router();
const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.CREATOR, UserRole.USER]).optional(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const verify2FASchema = z.object({
  userId: z.number(),
  token: z.string(),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const updateRoleSchema = z.object({
  userId: z.number(),
  role: z.enum([UserRole.ADMIN, UserRole.CREATOR, UserRole.USER]),
});

// Register new user
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Registration failed' });
    }
  }
});

// Login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(
      username,
      password,
      req.ip,
      req.headers['user-agent']
    );
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ message: error.message });
    } else {
      res.status(401).json({ message: 'Login failed' });
    }
  }
});

// Protected routes require authentication
router.use(authenticate);

// Verify 2FA token
router.post('/verify-2fa', validateRequest(verify2FASchema), async (req, res) => {
  try {
    const { userId, token } = req.body;
    const result = await authService.verify2FA(userId, token);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ message: error.message });
    } else {
      res.status(401).json({ message: '2FA verification failed' });
    }
  }
});

// Enable 2FA
router.post('/enable-2fa', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const result = await authService.enable2FA(userId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to enable 2FA' });
    }
  }
});

// Disable 2FA
router.post('/disable-2fa', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await authService.disable2FA(userId);
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to disable 2FA' });
    }
  }
});

// Request password reset
router.post('/reset-password-request', validateRequest(resetPasswordRequestSchema), async (req, res) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ message: 'If an account exists with that email, a reset link will be sent.' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to request password reset' });
    }
  }
});

// Reset password with token
router.post('/reset-password', validateRequest(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to reset password' });
    }
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    await authService.logout(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to logout' });
    }
  }
});

// Admin routes require admin role
router.use(requireRole([UserRole.ADMIN]));

// Update user role (admin only)
router.patch('/users/:userId/role', validateRequest(updateRoleSchema), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = parseInt(req.params.userId);
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updatedUser = await authService.updateUserRole(userId, role, adminUserId);
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to update user role' });
    }
  }
});

// Deactivate user (admin only)
router.post('/users/:userId/deactivate', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updatedUser = await authService.deactivateUser(userId, adminUserId);
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to deactivate user' });
    }
  }
});

// Activate user (admin only)
router.post('/users/:userId/activate', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updatedUser = await authService.activateUser(userId, adminUserId);
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(400).json({ message: 'Failed to activate user' });
    }
  }
});

export default router; 