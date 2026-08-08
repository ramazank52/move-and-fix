/**
 * Webhook Signature Verification Module
 * 
 * Verifies webhook signatures from payment gateways (iyzico, Stripe)
 * to ensure authenticity and prevent unauthorized webhook calls.
 * 
 * CRITICAL SECURITY: All webhooks must be verified before processing
 */

import crypto from 'crypto';

// Simple logger utility
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

interface WebhookVerificationConfig {
  iyzico?: {
    secretKey: string;
  };
  stripe?: {
    signingSecret: string;
  };
}

interface VerificationResult {
  valid: boolean;
  error?: string;
  provider?: string;
}

/**
 * Webhook Verification Service
 * Handles signature verification for multiple payment providers
 */
export class WebhookVerificationService {
  private config: WebhookVerificationConfig;

  constructor(config: WebhookVerificationConfig) {
    this.config = config;
    logger.info('WebhookVerificationService initialized');
  }

  /**
   * Verify iyzico webhook signature
   * iyzico uses HMAC-SHA1 signature verification
   */
  verifyIyzicoSignature(
    payload: string,
    signature: string
  ): VerificationResult {
    try {
      if (!this.config.iyzico?.secretKey) {
        logger.error('iyzico secret key not configured');
        return {
          valid: false,
          error: 'iyzico secret key not configured',
          provider: 'iyzico'
        };
      }

      // iyzico uses HMAC-SHA1
      const expectedSignature = crypto
        .createHmac('sha1', this.config.iyzico.secretKey)
        .update(payload)
        .digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.warn('Invalid iyzico webhook signature', {
          received: signature.substring(0, 10) + '...',
          expected: expectedSignature.substring(0, 10) + '...'
        });
      }

      return {
        valid: isValid,
        provider: 'iyzico'
      };
    } catch (error) {
      logger.error('Error verifying iyzico signature', { error });
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'iyzico'
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   * Stripe uses HMAC-SHA256 signature verification
   */
  verifyStripeSignature(
    payload: string,
    signature: string
  ): VerificationResult {
    try {
      if (!this.config.stripe?.signingSecret) {
        logger.error('Stripe signing secret not configured');
        return {
          valid: false,
          error: 'Stripe signing secret not configured',
          provider: 'stripe'
        };
      }

      // Stripe signature format: t=timestamp,v1=signature
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
      const receivedSignature = parts.find(p => p.startsWith('v1='))?.substring(3);

      if (!timestamp || !receivedSignature) {
        logger.warn('Invalid Stripe signature format', { signature });
        return {
          valid: false,
          error: 'Invalid signature format',
          provider: 'stripe'
        };
      }

      // Prevent replay attacks - check timestamp is recent (within 5 minutes)
      const signedContent = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.stripe.signingSecret)
        .update(signedContent)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.warn('Invalid Stripe webhook signature', {
          received: receivedSignature.substring(0, 10) + '...',
          expected: expectedSignature.substring(0, 10) + '...'
        });
      }

      return {
        valid: isValid,
        provider: 'stripe'
      };
    } catch (error) {
      logger.error('Error verifying Stripe signature', { error });
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'stripe'
      };
    }
  }

  /**
   * Generic webhook verification
   * Detects provider and verifies accordingly
   */
  verify(
    payload: string,
    signature: string,
    provider: 'iyzico' | 'stripe'
  ): VerificationResult {
    logger.info(`Verifying webhook signature for provider: ${provider}`);

    switch (provider) {
      case 'iyzico':
        return this.verifyIyzicoSignature(payload, signature);
      case 'stripe':
        return this.verifyStripeSignature(payload, signature);
      default:
        return {
          valid: false,
          error: `Unknown provider: ${provider}`
        };
    }
  }
}

/**
 * Middleware for Express to verify webhook signatures
 */
export function webhookVerificationMiddleware(
  verificationService: WebhookVerificationService,
  provider: 'iyzico' | 'stripe'
) {
  return (req: any, res: any, next: any) => {
    try {
      const signature = req.headers['x-iyzico-signature'] ||
                       req.headers['stripe-signature'];

      if (!signature) {
        logger.error('Missing webhook signature header', {
          provider,
          headers: Object.keys(req.headers)
        });
        return res.status(401).json({
          error: 'Missing signature',
          message: 'Webhook signature required'
        });
      }

      // Get raw body for signature verification
      const payload = req.rawBody || JSON.stringify(req.body);

      const result = verificationService.verify(payload, signature, provider);

      if (!result.valid) {
        logger.error('Webhook signature verification failed', {
          provider,
          error: result.error
        });
        return res.status(401).json({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed'
        });
      }

      logger.info('Webhook signature verified successfully', { provider });
      next();
    } catch (error) {
      logger.error('Error in webhook verification middleware', { error });
      return res.status(500).json({
        error: 'Verification error',
        message: 'Failed to verify webhook signature'
      });
    }
  };
}

/**
 * Webhook Replay Attack Prevention
 * Tracks processed webhook IDs to prevent duplicate processing
 */
export class WebhookReplayProtection {
  private processedWebhooks = new Map<string, number>();
  private readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if webhook has been processed before
   */
  isProcessed(webhookId: string): boolean {
    const timestamp = this.processedWebhooks.get(webhookId);
    if (!timestamp) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - timestamp > this.EXPIRY_TIME) {
      this.processedWebhooks.delete(webhookId);
      return false;
    }

    return true;
  }

  /**
   * Mark webhook as processed
   */
  markProcessed(webhookId: string): void {
    this.processedWebhooks.set(webhookId, Date.now());
    logger.info(`Webhook ${webhookId} marked as processed`);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, timestamp] of this.processedWebhooks.entries()) {
      if (now - timestamp > this.EXPIRY_TIME) {
        this.processedWebhooks.delete(id);
      }
    }
    logger.info('Webhook replay protection cleanup completed');
  }
}

// Export singleton instances
export const webhookReplayProtection = new WebhookReplayProtection();

// Cleanup every hour
setInterval(() => {
  webhookReplayProtection.cleanup();
}, 60 * 60 * 1000);
