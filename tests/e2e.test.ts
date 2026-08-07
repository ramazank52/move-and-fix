/**
 * End-to-End (E2E) Tests
 * 
 * Tüm sistemin uçtan uca test edilmesi
 * - User registration ve authentication
 * - Service order creation ve completion
 * - Payment processing
 * - Notification delivery
 * - Analytics tracking
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ============================================================================
// E2E Test Suite: User Journey
// ============================================================================

describe('E2E: Complete User Journey', () => {
  let customerId: string;
  let providerId: string;
  let orderId: string;
  let paymentId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create test users
    console.log('Setting up E2E test environment...');
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    console.log('Cleaning up E2E test environment...');
  });

  describe('1. User Registration & Authentication', () => {
    it('should register a new customer', async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@test.com',
          password: 'SecurePass123!',
          name: 'Test Customer',
          phone: '+905551234567',
          userType: 'customer',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      customerId = data.id;
    });

    it('should register a new service provider', async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'provider@test.com',
          password: 'SecurePass123!',
          name: 'Test Provider',
          phone: '+905559876543',
          userType: 'provider',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      providerId = data.id;
    });

    it('should login customer and get token', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@test.com',
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeDefined();
      authToken = data.token;
    });

    it('should verify email with OTP', async () => {
      // Simulate OTP verification
      const response = await fetch('/api/verify/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: 'customer@test.com',
          code: '123456', // In real test, get from email
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('2. Service Order Creation', () => {
    it('should create a new service order', async () => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category: 'temizlik',
          description: 'Ev temizliği - 3 oda',
          budget: 1500,
          location: {
            latitude: 41.0082,
            longitude: 28.9784,
            address: 'Istanbul, Turkey',
          },
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.status).toBe('pending');
      orderId = data.id;
    });

    it('should retrieve order details', async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(orderId);
      expect(data.status).toBe('pending');
    });

    it('should list customer orders', async () => {
      const response = await fetch('/api/orders?status=pending', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('3. Provider Offer & Acceptance', () => {
    let providerToken: string;

    beforeAll(async () => {
      // Get provider token
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'provider@test.com',
          password: 'SecurePass123!',
        }),
      });
      const data = await response.json();
      providerToken = data.token;
    });

    it('should create an offer for the order', async () => {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          orderId,
          price: 1200,
          description: 'Profesyonel temizlik hizmeti',
          estimatedDuration: 3,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.status).toBe('pending');
    });

    it('should accept the offer', async () => {
      // Get offers first
      const offersResponse = await fetch(`/api/orders/${orderId}/offers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const offersData = await offersResponse.json();
      const offerId = offersData[0].id;

      // Accept offer
      const response = await fetch(`/api/offers/${offerId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('accepted');
    });
  });

  describe('4. Payment Processing', () => {
    it('should create a payment', async () => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId,
          amount: 1200,
          paymentMethod: 'card',
          cardToken: 'tok_test_card',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.status).toBe('completed');
      paymentId = data.id;
    });

    it('should hold payment in escrow', async () => {
      const response = await fetch(`/api/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.escrowStatus).toBe('held');
    });

    it('should get wallet balance after payment', async () => {
      const response = await fetch('/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.balance).toBeDefined();
      expect(typeof data.balance).toBe('number');
    });
  });

  describe('5. Service Completion & Review', () => {
    it('should mark order as completed', async () => {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
    });

    it('should release payment from escrow', async () => {
      const response = await fetch(`/api/payments/${paymentId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('released');
    });

    it('should create a review for the provider', async () => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId,
          providerId,
          rating: 5,
          comment: 'Harika hizmet, çok memnun kaldım!',
          categories: {
            quality: 5,
            communication: 5,
            punctuality: 5,
            pricePerformance: 5,
            cleanliness: 5,
          },
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
    });
  });

  describe('6. Notifications', () => {
    it('should receive order notification', async () => {
      const response = await fetch('/api/notifications?type=order_created', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should update notification preferences', async () => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          channels: {
            push: true,
            sms: false,
            email: true,
            in_app: true,
          },
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('7. Analytics Tracking', () => {
    it('should track user activity', async () => {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          event: 'order_created',
          properties: {
            category: 'temizlik',
            budget: 1500,
          },
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should get user analytics', async () => {
      const response = await fetch('/api/analytics/user', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalOrders).toBeDefined();
      expect(data.totalSpent).toBeDefined();
    });
  });

  describe('8. Error Scenarios', () => {
    it('should handle invalid order creation', async () => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category: 'invalid_category',
          description: '',
          budget: -100,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should handle not found errors', async () => {
      const response = await fetch('/api/orders/nonexistent-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should handle rate limiting', async () => {
      // Make rapid requests
      const requests = Array(101).fill(null).map(() =>
        fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('9. Performance Tests', () => {
    it('should respond to order list within 500ms', async () => {
      const start = Date.now();
      await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(10);
    });
  });
});

// ============================================================================
// E2E Test Suite: Admin Operations
// ============================================================================

describe('E2E: Admin Operations', () => {
  let ownerToken: string;

  beforeAll(async () => {
    // Get owner token
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@movefix.com',
        password: 'OwnerPass123!',
      }),
    });
    const data = await response.json();
    ownerToken = data.token;
  });

  describe('Admin Dashboard', () => {
    it('should get analytics dashboard', async () => {
      const response = await fetch('/api/admin/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${ownerToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalUsers).toBeDefined();
      expect(data.totalRevenue).toBeDefined();
    });

    it('should manage categories', async () => {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Bahçe Tasarımı',
          description: 'Profesyonel bahçe tasarımı hizmetleri',
          icon: 'garden',
        }),
      });

      expect(response.status).toBe(201);
    });
  });
});
