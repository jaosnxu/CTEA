
import { Request, Response } from "express";
import { ORDERS } from "./db_mock.js";

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

export const createPayment = async (req: Request, res: Response) => {
  const { orderId, amount, items } = req.body;
  const paymentId = `PAY_${Date.now()}`;

  // Create new order record if not exists
  if (!ORDERS.find(o => o.id === orderId)) {
    ORDERS.unshift({
      id: orderId,
      status: "PENDING",
      total: amount,
      items: items.map((i: any) => ({
        productId: i.id,
        productName: i.name_ru || i.name_en || i.name_zh,
        variant: i.selectedVariant ? (i.selectedVariant.name_ru || i.selectedVariant.name_en) : "Standard",
        price: i.totalPrice,
        quantity: i.quantity
      })),
      createdAt: new Date().toISOString(),
      prefix: "P" // Default to PWA
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
    const order = ORDERS.find(o => o.id === orderId);
    if (order) {
      order.status = "PAID";
    }

    res.json({ status: "PAID", paymentId });

  } catch (error) {
    // Step 3b: Failure - Auto Void (Fail-Safe)
    console.error(`[System] IIKO Push Failed: ${(error as Error).message}`);
    console.log(`[System] Triggering Auto-Void for ${paymentId}...`);
    
    await voidPayment(paymentId);
    
    // Update DB status (Mock)
    const order = ORDERS.find(o => o.id === orderId);
    if (order) {
      order.status = "VOIDED";
    }

    // Return 200 OK but with VOIDED status so frontend can handle it gracefully
    res.json({ 
      status: "VOIDED", 
      message: "Order push failed. Payment voided automatically.",
      paymentId 
    });
  }
};
