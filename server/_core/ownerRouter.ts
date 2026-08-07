/**
 * Owner Router - MoveOS için API endpoints
 * 
 * Kurucu (Owner) için tüm yönetim işlemleri
 */

import { router, publicProcedure, protectedProcedure } from './trpc';
import { z } from 'zod';

export const ownerRouter = router({
  /**
   * Authentication
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      // Mock owner login
      if (input.email === 'owner@movefix.com' && input.password === 'password123') {
        return {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciIsImVtYWlsIjoib3duZXJAbW92ZWZpeC5jb20iLCJyb2xlIjoib3duZXIifQ.mock',
          user: {
            id: 'owner',
            email: 'owner@movefix.com',
            name: 'Move&Fix Kurucu',
            role: 'owner',
          },
          requires2FA: false,
        };
      }
      throw new Error('Geçersiz kimlik bilgileri');
    }),

  verify2FA: publicProcedure
    .input(z.object({
      email: z.string().email(),
      otpCode: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      // Mock 2FA verification
      if (input.otpCode === '123456') {
        return {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvd25lciIsImVtYWlsIjoib3duZXJAbW92ZWZpeC5jb20iLCJyb2xlIjoib3duZXIifQ.mock',
          user: {
            id: 'owner',
            email: input.email,
            name: 'Move&Fix Kurucu',
            role: 'owner',
          },
        };
      }
      throw new Error('Geçersiz OTP kodu');
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      return { success: true };
    }),

  /**
   * Dashboard
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        dailyRevenue: 45000,
        totalRevenue: 1250000,
        commissionRevenue: 125000,
        pendingPayments: 15000,
        activeUsers: 2350,
        activeProviders: 480,
        dailyOrders: 156,
        systemStatus: 'healthy',
        risks: [
          'Yüksek iptal oranı (%8.5) - İncelenmelidir',
          'Banka hesabında düşük bakiye - Para yatırılmalıdır',
        ],
        recommendations: [
          'Elektrik kategorisinde kampanya başlatılmalı',
          'Yeni ustaları onaylamaya devam et',
          'Müşteri destek ekibini genişlet',
        ],
      };
    }),

  /**
   * Users Management
   */
  users: protectedProcedure
    .input(z.object({
      role: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      // Mock users list
      return {
        total: 2350,
        users: [
          {
            id: '1',
            email: 'customer1@example.com',
            name: 'Ahmet Yılmaz',
            role: 'customer',
            createdAt: new Date('2024-01-15'),
            status: 'active',
          },
          {
            id: '2',
            email: 'provider1@example.com',
            name: 'Elektrikçi Mehmet',
            role: 'provider',
            createdAt: new Date('2024-01-10'),
            status: 'active',
            rating: 4.8,
            completedJobs: 156,
          },
        ],
      };
    }),

  getUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return {
        id: input.userId,
        email: 'user@example.com',
        name: 'Kullanıcı Adı',
        role: 'customer',
        createdAt: new Date(),
        profileData: {},
      };
    }),

  /**
   * Categories Management
   */
  categories: protectedProcedure
    .query(async () => {
      return [
        {
          id: 1,
          name: 'Temizlik',
          description: 'Ev ve ofis temizliği',
          commission: 15,
          active: true,
        },
        {
          id: 2,
          name: 'Su Tesisatı',
          description: 'Su tesisatı ve onarım',
          commission: 18,
          active: true,
        },
        {
          id: 3,
          name: 'Elektrik',
          description: 'Elektrik tesisatı ve onarım',
          commission: 20,
          active: true,
        },
      ];
    }),

  createCategory: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      commission: z.number(),
    }))
    .mutation(async ({ input }) => {
      return {
        id: Math.random(),
        ...input,
        active: true,
        createdAt: new Date(),
      };
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      categoryId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      commission: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return {
        id: input.categoryId,
        name: input.name || 'Kategori Adı',
        description: input.description || 'Açıklama',
        commission: input.commission || 15,
        active: true,
        updatedAt: new Date(),
      };
    }),

  /**
   * AI Command
   */
  aiCommand: protectedProcedure
    .input(z.object({ command: z.string() }))
    .mutation(async ({ input }) => {
      // Mock AI response
      const command = input.command.toLowerCase();

      if (command.includes('kategori') && command.includes('ekle')) {
        return {
          response: '✅ Yeni kategori oluşturmaya hazırım. Kategori adı, açıklama ve komisyon oranını belirt.',
          action: 'create_category',
          preview: {
            name: 'Yeni Kategori',
            commission: 15,
          },
        };
      }

      if (command.includes('komisyon')) {
        return {
          response: '✅ Komisyon oranını güncellemeye hazırım. Hangi kategorinin komisyonunu değiştirmek istiyorsun?',
          action: 'update_commission',
        };
      }

      return {
        response: '✅ Komutunuzu anladım. Lütfen daha spesifik bir talimat verin.',
        action: 'help',
      };
    }),

  /**
   * Wallet
   */
  wallet: protectedProcedure
    .query(async () => {
      return {
        balance: 125000,
        totalEarnings: 1250000,
        totalWithdrawals: 1125000,
        pendingWithdrawals: 0,
        lastWithdrawal: new Date('2024-08-01'),
        bankAccounts: [
          {
            id: '1',
            bankName: 'Ziraat Bankası',
            accountNumber: '****5678',
            iban: 'TR****',
            isDefault: true,
          },
        ],
      };
    }),

  withdrawFunds: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      bankAccountId: z.string(),
    }))
    .mutation(async ({ input }) => {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}`,
        amount: input.amount,
        status: 'pending',
        estimatedTime: '1-2 iş günü',
      };
    }),

  /**
   * Analytics
   */
  analytics: protectedProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async () => {
      return {
        period: 'Bu Ay',
        totalOrders: 3450,
        totalRevenue: 125000,
        averageOrderValue: 36.2,
        customerSatisfaction: 4.6,
        topCategories: [
          { name: 'Temizlik', orders: 890, revenue: 35000 },
          { name: 'Elektrik', orders: 650, revenue: 32500 },
          { name: 'Su Tesisatı', orders: 540, revenue: 27000 },
        ],
        topProviders: [
          { name: 'Elektrikçi Mehmet', orders: 156, rating: 4.9 },
          { name: 'Tesisatçı Ali', orders: 142, rating: 4.8 },
          { name: 'Temizlik Şirketi XYZ', orders: 128, rating: 4.7 },
        ],
      };
    }),
});
