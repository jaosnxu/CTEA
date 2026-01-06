import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { PRODUCTS, ORDERS, USER_PROFILE } from "./db_mock";
import { z } from "zod";
import { syncFromIIKO, resetAllOverrides } from "./iiko-sync";
import { getPaymentSettings, updatePaymentSettings, validatePaymentSettings } from "./db_payment_settings";
import { createPaymentGateway } from "./payment-gateway";
import { getIIKOSettings, updateIIKOSettings } from "./db_iiko_settings";
import { createIIKOClient, MockIIKOClient } from "./iiko-api";
import { getTelegramSettings, updateTelegramSettings } from "./db_telegram_settings";
import { createTelegramBot } from "./telegram-bot";
import { MEMBERSHIP_TIERS, getUserMembership, addPoints, redeemPoints, COUPONS, validateCoupon, applyCoupon } from "./membership";
import { DELIVERY_ZONES, addDeliveryAddress, getUserAddresses, calculateDeliveryFee, DRIVERS } from "./delivery";
import { CAMPAIGNS, getActiveCampaigns, createCampaign, updateCampaign, deleteCampaign } from "./marketing";
import { TRANSLATIONS, translate, getAllTranslations, upsertTranslation, deleteTranslation } from "./i18n";
import { getDashboardSummary, generateSalesReport, getProductAnalytics } from "./analytics";

// 演示模式开关：true 为模拟超时失败，false 为正常成功
const DEMO_FAIL_MODE = true; // Forced for Demo

// Mock IIKO API call
const pushOrderToIIKO = async (orderId: string): Promise<boolean> => {
  console.log(`[IIKO] Pushing order ${orderId}...`);
  
  if (DEMO_FAIL_MODE) {
    // 模拟超时失败
    return new Promise((_, reject) => {
      setTimeout(() => {
        console.log(`[IIKO] Order ${orderId} push TIMEOUT`);
        reject(new Error("IIKO Gateway Timeout"));
      }, 2000);
    });
  }

  // 模拟成功
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[IIKO] Order ${orderId} push SUCCESS`);
      resolve(true);
    }, 500);
  });
};

// Mock Payment Gateway Void
const voidPayment = async (paymentId: string): Promise<boolean> => {
  console.log(`[Payment] Voiding transaction ${paymentId}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[Payment] Transaction ${paymentId} VOIDED successfully.`);
      resolve(true);
    }, 500);
  });
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    list: publicProcedure.query(() => {
      return PRODUCTS;
    }),
  }),

  orders: router({
    list: publicProcedure.query(() => {
      return ORDERS;
    }),
  }),

  user: router({
    me: publicProcedure.query(() => {
      return USER_PROFILE;
    }),
  }),

  payment: router({
    create: publicProcedure
      .input(
        z.object({
          orderId: z.string(),
          amount: z.number(),
          items: z.array(z.any()),
        })
      )
      .mutation(async ({ input }) => {
        const { orderId, amount, items } = input;
        const paymentId = `PAY_${Date.now()}`;

        // Create new order record if not exists
        if (!ORDERS.find((o) => o.id === orderId)) {
          ORDERS.unshift({
            id: orderId,
            status: "PENDING",
            total: amount,
            items: items.map((i: any) => ({
              productId: i.id,
              productName: i.name_ru || i.name_en || i.name_zh,
              variant: i.selectedVariant
                ? i.selectedVariant.name_ru || i.selectedVariant.name_en
                : "Standard",
              price: i.totalPrice,
              quantity: i.quantity,
            })),
            createdAt: new Date().toISOString(),
            prefix: "P", // Default to PWA
          });
        }

        console.log(`[Payment] Creating Pre-Auth for Order ${orderId}, Amount: ${amount}`);
        console.log(`[Payment] Pre-Auth ${paymentId} SUCCESS. Holding funds.`);

        try {
          // Step 2: Push to IIKO
          await pushOrderToIIKO(orderId);

          // Step 3a: Success - Capture
          console.log(`[Payment] IIKO confirmed. Capturing funds for ${paymentId}...`);

          // Update DB status
          const order = ORDERS.find((o) => o.id === orderId);
          if (order) {
            order.status = "PAID";
          }

          return { status: "PAID", paymentId };
        } catch (error) {
          // Step 3b: Failure - Auto Void (Fail-Safe)
          console.error(`[System] IIKO Push Failed: ${(error as Error).message}`);
          console.log(`[System] Triggering Auto-Void for ${paymentId}...`);

          await voidPayment(paymentId);

          // Update DB status (Mock)
          const order = ORDERS.find((o) => o.id === orderId);
          if (order) {
            order.status = "VOIDED";
          }

          // Return with VOIDED status so frontend can handle it gracefully
          return {
            status: "VOIDED",
            message: "Order push failed. Payment voided automatically.",
            paymentId,
          };
        }
      }),
  }),

  admin: router({
    payment: router({
      getSettings: adminProcedure.query(() => {
        return getPaymentSettings();
      }),
      updateSettings: adminProcedure
        .input(
          z.object({
            provider: z.enum(['tinkoff', 'yookassa', 'mock']).optional(),
            enabled: z.boolean().optional(),
            testMode: z.boolean().optional(),
            tinkoffTerminalKey: z.string().optional(),
            tinkoffSecretKey: z.string().optional(),
            yookassaShopId: z.string().optional(),
            yookassaSecretKey: z.string().optional(),
            enablePreAuth: z.boolean().optional(),
            autoVoidOnFailure: z.boolean().optional(),
          })
        )
        .mutation(({ input, ctx }) => {
          const validation = validatePaymentSettings(input);
          if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }
          
          const adminName = ctx.user?.name || 'Unknown Admin';
          const updated = updatePaymentSettings(input, adminName);
          return { success: true, settings: updated };
        }),
      testConnection: adminProcedure
        .input(
          z.object({
            provider: z.enum(['tinkoff', 'yookassa', 'mock']),
          })
        )
        .mutation(async ({ input }) => {
          const settings = getPaymentSettings();
          const gateway = createPaymentGateway({
            provider: input.provider,
            testMode: true,
            tinkoffTerminalKey: settings.tinkoffTerminalKey,
            tinkoffSecretKey: settings.tinkoffSecretKey,
            yookassaShopId: settings.yookassaShopId,
            yookassaSecretKey: settings.yookassaSecretKey,
          });
          
          try {
            const result = await gateway.createPayment({
              orderId: `TEST_${Date.now()}`,
              amount: 1, // ₽1 test payment
              currency: 'RUB',
              description: 'Test payment from CHU TEA admin',
            });
            
            return {
              success: result.success,
              message: result.success
                ? 'Connection successful'
                : result.error || 'Connection failed',
            };
          } catch (error: any) {
            return {
              success: false,
              message: error.message,
            };
          }
        }),
    }),
    products: router({
      list: adminProcedure.query(() => {
        return PRODUCTS;
      }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            price: z.number().optional(),
            name_ru: z.string().optional(),
          })
        )
        .mutation(({ input }) => {
          const product = PRODUCTS.find((p) => p.id === input.id);
          if (product) {
            // Update fields
            if (input.price !== undefined) product.price = input.price;
            if (input.name_ru !== undefined) product.name_ru = input.name_ru;
            
            // Mark as manually overridden to prevent IIKO sync from overwriting
            product.is_manual_override = true;
            
            console.log(`[Admin] Product ${input.id} updated. Manual override flag set.`);
            return { success: true, product };
          } else {
            throw new Error("Product not found");
          }
        }),
    }),
  }),

  // IIKO Sync Simulator (Demo purposes)
  iiko: router({
    sync: publicProcedure
      .input(
        z.object({
          forceOverride: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await syncFromIIKO(input.forceOverride || false);
        return result;
      }),
    resetOverrides: publicProcedure.mutation(() => {
      resetAllOverrides();
      return { success: true, message: "All override flags cleared" };
    }),
    // Admin IIKO settings
    getSettings: adminProcedure.query(() => {
      return getIIKOSettings();
    }),
    updateSettings: adminProcedure
      .input(
        z.object({
          enabled: z.boolean().optional(),
          apiUrl: z.string().optional(),
          apiLogin: z.string().optional(),
          organizationId: z.string().optional(),
          syncInterval: z.number().optional(),
          autoSyncEnabled: z.boolean().optional(),
          respectManualOverride: z.boolean().optional(),
        })
      )
      .mutation(({ input, ctx }) => {
        const adminName = ctx.user?.name || 'Unknown Admin';
        const updated = updateIIKOSettings(input, adminName);
        return { success: true, settings: updated };
      }),
    testConnection: adminProcedure.mutation(async () => {
      const settings = getIIKOSettings();
      
      if (!settings.apiLogin || !settings.organizationId) {
        return {
          success: false,
          message: 'Please configure IIKO credentials first',
        };
      }
      
      const client = createIIKOClient({
        apiUrl: settings.apiUrl,
        apiLogin: settings.apiLogin,
        organizationId: settings.organizationId,
        enabled: settings.enabled,
        syncInterval: settings.syncInterval,
      });
      
      return await client.testConnection();
    }),
  }),

  // Telegram Bot Management
  telegram: router({
    getSettings: adminProcedure.query(() => {
      return getTelegramSettings();
    }),
    updateSettings: adminProcedure
      .input(
        z.object({
          enabled: z.boolean().optional(),
          botToken: z.string().optional(),
          webhookUrl: z.string().optional(),
          miniAppUrl: z.string().optional(),
          sendOrderConfirmations: z.boolean().optional(),
          sendStatusUpdates: z.boolean().optional(),
        })
      )
      .mutation(({ input, ctx }) => {
        const adminName = ctx.user?.name || 'Unknown Admin';
        const updated = updateTelegramSettings(input, adminName);
        return { success: true, settings: updated };
      }),
    testConnection: adminProcedure.mutation(async () => {
      const settings = getTelegramSettings();
      const bot = createTelegramBot(settings);
      return await bot.testConnection();
    }),
  }),

  // Membership System
  membership: router({
    getTiers: publicProcedure.query(() => {
      return MEMBERSHIP_TIERS;
    }),
    getUserMembership: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return getUserMembership(input.userId);
      }),
    addPoints: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          amount: z.number(),
          type: z.enum(['EARN', 'REDEEM', 'BONUS', 'REFERRAL']),
          description: z.string(),
          orderId: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        return addPoints(input.userId, input.amount, input.type, input.description, input.orderId);
      }),
    redeemPoints: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          amount: z.number(),
          description: z.string(),
        })
      )
      .mutation(({ input }) => {
        const success = redeemPoints(input.userId, input.amount, input.description);
        return { success };
      }),
    getCoupons: publicProcedure.query(() => {
      return COUPONS.filter(c => c.isActive);
    }),
    validateCoupon: publicProcedure
      .input(
        z.object({
          code: z.string(),
          orderAmount: z.number(),
        })
      )
      .query(({ input }) => {
        const coupon = validateCoupon(input.code, input.orderAmount);
        return { valid: !!coupon, coupon };
      }),
  }),

  // Delivery Management
  delivery: router({
    getZones: publicProcedure.query(() => {
      return DELIVERY_ZONES.filter(z => z.isActive);
    }),
    getUserAddresses: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return getUserAddresses(input.userId);
      }),
    addAddress: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          name: z.string(),
          phone: z.string(),
          address: z.string(),
          building: z.string().optional(),
          apartment: z.string().optional(),
          entrance: z.string().optional(),
          floor: z.string().optional(),
          notes: z.string().optional(),
          lat: z.number().optional(),
          lng: z.number().optional(),
          isDefault: z.boolean(),
        })
      )
      .mutation(({ input }) => {
        return addDeliveryAddress(input);
      }),
    calculateFee: publicProcedure
      .input(
        z.object({
          lat: z.number(),
          lng: z.number(),
          orderAmount: z.number(),
        })
      )
      .query(({ input }) => {
        return calculateDeliveryFee(input.lat, input.lng, input.orderAmount);
      }),
    getDrivers: adminProcedure.query(() => {
      return DRIVERS;
    }),
  }),

  // Marketing Campaigns
  marketing: router({
    getActiveCampaigns: publicProcedure.query(() => {
      return getActiveCampaigns();
    }),
    getAllCampaigns: adminProcedure.query(() => {
      return CAMPAIGNS;
    }),
    createCampaign: adminProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(['DISCOUNT', 'BOGO', 'BUNDLE', 'FLASH_SALE', 'HAPPY_HOUR']),
          status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']),
          startDate: z.string(),
          endDate: z.string(),
          rules: z.any(),
          priority: z.number(),
        })
      )
      .mutation(({ input }) => {
        return createCampaign(input);
      }),
    updateCampaign: adminProcedure
      .input(
        z.object({
          id: z.string(),
          updates: z.any(),
        })
      )
      .mutation(({ input }) => {
        return updateCampaign(input.id, input.updates);
      }),
    deleteCampaign: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        const success = deleteCampaign(input.id);
        return { success };
      }),
  }),

  // Internationalization
  i18n: router({
    getTranslations: publicProcedure
      .input(z.object({ lang: z.enum(['zh', 'en', 'ru']) }))
      .query(({ input }) => {
        return getAllTranslations(input.lang);
      }),
    getAllTranslations: adminProcedure.query(() => {
      return TRANSLATIONS;
    }),
    upsertTranslation: adminProcedure
      .input(
        z.object({
          key: z.string(),
          zh: z.string(),
          en: z.string(),
          ru: z.string(),
          category: z.string(),
        })
      )
      .mutation(({ input }) => {
        return upsertTranslation(input);
      }),
    deleteTranslation: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(({ input }) => {
        const success = deleteTranslation(input.key);
        return { success };
      }),
  }),

  // Analytics Dashboard
  analytics: router({
    getDashboard: adminProcedure.query(() => {
      return getDashboardSummary(ORDERS);
    }),
    getSalesReport: adminProcedure
      .input(
        z.object({
          period: z.enum(['day', 'week', 'month', 'year']),
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(({ input }) => {
        return generateSalesReport(
          input.period,
          new Date(input.startDate),
          new Date(input.endDate),
          ORDERS
        );
      }),
    getProductAnalytics: adminProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => {
        return getProductAnalytics(input.productId, ORDERS);
      }),
  }),
});

export type AppRouter = typeof appRouter;
