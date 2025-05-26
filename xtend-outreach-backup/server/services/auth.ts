import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { storage } from '../storage';
import { UserRole, type User } from '@shared/schema';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

export class AuthService {
  // User registration
  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: string;
  }): Promise<User> {
    // Hash password
    const hashedPassword = await hash(userData.password, SALT_ROUNDS);

    // Create user with hashed password
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      role: userData.role || UserRole.USER,
      isActive: true,
      createdAt: new Date(),
    });

    return user;
  }

  // User login
  async loginUser(username: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
      };
    }

    // Create session
    const token = await this.createSession(user.id, ipAddress, userAgent);

    // Update last login
    await storage.updateUser(user.id, {
      lastLogin: new Date(),
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  // Verify 2FA token
  async verify2FA(userId: number, token: string) {
    const user = await storage.getUser(userId);
    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled for this user');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    // Create session after successful 2FA
    const sessionToken = await this.createSession(user.id);

    return {
      token: sessionToken,
      user: this.sanitizeUser(user),
    };
  }

  // Enable 2FA for a user
  async enable2FA(userId: number) {
    const secret = authenticator.generateSecret();
    await storage.updateUser(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    });

    const user = await storage.getUser(userId);
    const otpauthUrl = authenticator.keyuri(
      user!.email,
      'Xtend Platform',
      secret
    );

    return {
      secret,
      otpauthUrl,
    };
  }

  // Disable 2FA for a user
  async disable2FA(userId: number) {
    await storage.updateUser(userId, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    });
  }

  // Password reset request
  async requestPasswordReset(email: string) {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist for security
      return true;
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

    await storage.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // TODO: Send email with reset link
    return true;
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string) {
    const user = await storage.getUserByResetToken(token);
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await hash(newPassword, SALT_ROUNDS);
    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return true;
  }

  // Create a new session
  private async createSession(userId: number, ipAddress?: string, userAgent?: string) {
    const token = sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await storage.createUserSession({
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return token;
  }

  // Verify session token
  async verifyToken(token: string) {
    try {
      const decoded = verify(token, JWT_SECRET) as { userId: number };
      const session = await storage.getUserSession(token);

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Session expired');
      }

      const user = await storage.getUser(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Update last activity
      await storage.updateUserSession(token, {
        lastActivity: new Date(),
      });

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Log out user (invalidate session)
  async logout(token: string) {
    await storage.deleteUserSession(token);
  }

  // User management functions
  async updateUserRole(userId: number, newRole: string, adminUserId: number) {
    const admin = await storage.getUser(adminUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    return await storage.updateUser(userId, { role: newRole });
  }

  async deactivateUser(userId: number, adminUserId: number) {
    const admin = await storage.getUser(adminUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    return await storage.updateUser(userId, { isActive: false });
  }

  async activateUser(userId: number, adminUserId: number) {
    const admin = await storage.getUser(adminUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    return await storage.updateUser(userId, { isActive: true });
  }

  // Helper function to remove sensitive data
  private sanitizeUser(user: User) {
    const { password, twoFactorSecret, resetPasswordToken, resetPasswordExpires, ...sanitizedUser } = user;
    return sanitizedUser;
  }
} 