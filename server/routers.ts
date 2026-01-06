import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { PRODUCTS, ORDERS, USER_PROFILE } from "./db_mock";
import { z } from "zod";

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
    products: router({
      list: publicProcedure.query(() => {
        return PRODUCTS;
      }),
      update: publicProcedure
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
});

export type AppRouter = typeof appRouter;
