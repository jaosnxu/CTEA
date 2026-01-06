
import { Request, Response } from "express";
import { ORDERS } from "./db_mock.js";

// Mock IIKO API call
const pushOrderToIIKO = async (orderId: string): Promise<boolean> => {
  console.log(`[IIKO] Pushing order ${orderId}...`);
  // Simulate success
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
  const { orderId, amount } = req.body;
  const paymentId = `PAY_${Date.now()}`;

  console.log(`[Payment] Creating Pre-Auth for Order ${orderId}, Amount: ${amount}`);
  console.log(`[Payment] Pre-Auth ${paymentId} SUCCESS. Holding funds.`);

  try {
    // Step 2: Push to IIKO
    await pushOrderToIIKO(orderId);
    
    // Step 3a: Success - Capture
    console.log(`[Payment] IIKO confirmed. Capturing funds for ${paymentId}...`);
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

    res.status(408).json({ 
      status: "VOIDED", 
      message: "Order push failed. Payment voided automatically.",
      paymentId 
    });
  }
};
