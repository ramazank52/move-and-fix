/**
 * Email Unsubscribe Management Module
 * 
 * Handles email unsubscribe links and preferences
 * Complies with CAN-SPAM, GDPR, and other regulations
 * 
 * CRITICAL COMPLIANCE: All marketing emails must include unsubscribe link
 */

import crypto from 'crypto';
import { ENV } from './env';

interface UnsubscribePreferences {
  userId: string;
  email: string;
  unsubscribedAt: Date;
  categories: {
    marketing: boolean;
    notifications: boolean;
    updates: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  unsubscribeToken: string;
  tokenExpiresAt: Date;
}

export function requireUnsubscribeSigningSecret(secret = ENV.unsubscribeSecret): string {
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET must be configured before unsubscribe links can be issued');
  }
  return secret;
}

/**
 * Email Unsubscribe Service
 */
export class EmailUnsubscribeService {
  private unsubscribePreferences = new Map<string, UnsubscribePreferences>();
  private readonly TOKEN_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(userId: string, email: string): string {
    const tokenData = `${userId}:${email}:${Date.now()}`;
    const token = crypto
      .createHmac('sha256', requireUnsubscribeSigningSecret())
      .update(tokenData)
      .digest('hex');

    return token;
  }

  /**
   * Create unsubscribe link
   */
  createUnsubscribeLink(userId: string, email: string, baseUrl: string): string {
    const token = this.generateUnsubscribeToken(userId, email);
    return `${baseUrl}/api/email/unsubscribe?token=${token}&userId=${userId}&email=${encodeURIComponent(email)}`;
  }

  /**
   * Register user unsubscribe preferences
   */
  registerUnsubscribePreferences(
    userId: string,
    email: string,
    categories?: Partial<UnsubscribePreferences['categories']>
  ): UnsubscribePreferences {
    const token = this.generateUnsubscribeToken(userId, email);

    const preferences: UnsubscribePreferences = {
      userId,
      email,
      unsubscribedAt: new Date(),
      categories: {
        marketing: categories?.marketing ?? false,
        notifications: categories?.notifications ?? false,
        updates: categories?.updates ?? false,
        promotions: categories?.promotions ?? false,
        newsletter: categories?.newsletter ?? false,
      },
      unsubscribeToken: token,
      tokenExpiresAt: new Date(Date.now() + this.TOKEN_EXPIRY),
    };

    this.unsubscribePreferences.set(userId, preferences);
    return preferences;
  }

  /**
   * Verify unsubscribe token
   */
  verifyUnsubscribeToken(
    token: string,
    userId: string,
    email: string
  ): boolean {
    const preferences = this.unsubscribePreferences.get(userId);

    if (!preferences) {
      return false;
    }

    // Check token expiry
    if (new Date() > preferences.tokenExpiresAt) {
      return false;
    }

    // Verify token matches
    const expectedToken = this.generateUnsubscribeToken(userId, email);
    return token === expectedToken;
  }

  /**
   * Unsubscribe user from all emails
   */
  unsubscribeFromAll(userId: string, email: string): UnsubscribePreferences | null {
    const preferences = this.unsubscribePreferences.get(userId);

    if (!preferences) {
      return this.registerUnsubscribePreferences(userId, email, {
        marketing: true,
        notifications: true,
        updates: true,
        promotions: true,
        newsletter: true,
      });
    }

    // Mark all categories as unsubscribed
    preferences.categories = {
      marketing: true,
      notifications: true,
      updates: true,
      promotions: true,
      newsletter: true,
    };
    preferences.unsubscribedAt = new Date();

    return preferences;
  }

  /**
   * Unsubscribe from specific category
   */
  unsubscribeFromCategory(
    userId: string,
    category: keyof UnsubscribePreferences['categories']
  ): UnsubscribePreferences | null {
    const preferences = this.unsubscribePreferences.get(userId);

    if (!preferences) {
      return null;
    }

    preferences.categories[category] = true;
    preferences.unsubscribedAt = new Date();

    return preferences;
  }

  /**
   * Resubscribe to category
   */
  resubscribeToCategory(
    userId: string,
    category: keyof UnsubscribePreferences['categories']
  ): UnsubscribePreferences | null {
    const preferences = this.unsubscribePreferences.get(userId);

    if (!preferences) {
      return null;
    }

    preferences.categories[category] = false;

    return preferences;
  }

  /**
   * Check if user is unsubscribed from category
   */
  isUnsubscribed(
    userId: string,
    category: keyof UnsubscribePreferences['categories']
  ): boolean {
    const preferences = this.unsubscribePreferences.get(userId);
    return preferences?.categories[category] ?? false;
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: string): UnsubscribePreferences | null {
    return this.unsubscribePreferences.get(userId) || null;
  }

  /**
   * Check if user is fully unsubscribed
   */
  isFullyUnsubscribed(userId: string): boolean {
    const preferences = this.unsubscribePreferences.get(userId);
    if (!preferences) {
      return false;
    }

    return Object.values(preferences.categories).every(v => v === true);
  }
}

/**
 * Email template with unsubscribe link
 */
export function createEmailWithUnsubscribeLink(
  emailContent: string,
  unsubscribeLink: string,
  unsubscribePreferencesLink?: string
): string {
  const unsubscribeHtml = `
    <div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
      <p>
        <a href="${unsubscribeLink}" style="color: #0066cc; text-decoration: none;">Unsubscribe from all emails</a>
        ${unsubscribePreferencesLink ? `| <a href="${unsubscribePreferencesLink}" style="color: #0066cc; text-decoration: none;">Manage preferences</a>` : ''}
      </p>
      <p style="margin-top: 10px;">
        You received this email because you're a Move&Fix user.
        We respect your privacy and will never share your email with third parties.
      </p>
    </div>
  `;

  return `${emailContent}${unsubscribeHtml}`;
}

/**
 * Express route handler for unsubscribe
 */
export function createUnsubscribeHandler(
  unsubscribeService: EmailUnsubscribeService
) {
  return (req: any, res: any) => {
    try {
      const { token, userId, email, category } = req.query;

      if (!token || !userId || !email) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'token, userId, and email are required'
        });
      }

      // Verify token
      if (!unsubscribeService.verifyUnsubscribeToken(token, userId, email)) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Unsubscribe token is invalid or expired'
        });
      }

      // Handle unsubscribe
      if (category) {
        // Unsubscribe from specific category
        if (!['marketing', 'notifications', 'updates', 'promotions', 'newsletter'].includes(category)) {
          return res.status(400).json({
            error: 'Invalid category',
            message: 'Category must be one of: marketing, notifications, updates, promotions, newsletter'
          });
        }

        unsubscribeService.unsubscribeFromCategory(
          userId,
          category as keyof UnsubscribePreferences['categories']
        );

        return res.json({
          success: true,
          message: `Successfully unsubscribed from ${category} emails`
        });
      } else {
        // Unsubscribe from all
        unsubscribeService.unsubscribeFromAll(userId, email);

        return res.json({
          success: true,
          message: 'Successfully unsubscribed from all emails'
        });
      }
    } catch (error) {
      console.error('Error processing unsubscribe request', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process unsubscribe request'
      });
    }
  };
}

/**
 * Express route handler for unsubscribe preferences
 */
export function createPreferencesHandler(
  unsubscribeService: EmailUnsubscribeService
) {
  return (req: any, res: any) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing userId',
          message: 'userId is required'
        });
      }

      const preferences = unsubscribeService.getPreferences(userId);

      if (!preferences) {
        return res.status(404).json({
          error: 'Not found',
          message: 'No unsubscribe preferences found for this user'
        });
      }

      return res.json(preferences);
    } catch (error) {
      console.error('Error fetching preferences', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch preferences'
      });
    }
  };
}

/**
 * Check if email should be sent based on user preferences
 */
export function shouldSendEmail(
  unsubscribeService: EmailUnsubscribeService,
  userId: string,
  emailCategory: keyof UnsubscribePreferences['categories']
): boolean {
  return !unsubscribeService.isUnsubscribed(userId, emailCategory);
}

// Export singleton
export const emailUnsubscribeService = new EmailUnsubscribeService();
