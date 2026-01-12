/**
 * CHUTEA 智慧中台 - 财务模块 API
 *
 * 功能：
 * 1. 提现审批列表
 * 2. 提现审批操作（批准/拒绝）
 * 3. 财务凭证生成
 * 4. 分账流水查询
 */

import { Router, Request, Response } from "express";
import { getDb } from "../../db";
import {
  withdrawalRequests,
  influencers,
  auditLogs,
  users,
} from "../../../drizzle/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { TelegramBotService } from "../services/telegram-bot-service";
import { generateAndUploadVoucherPdf } from "../services/voucher-pdf-service";

const router = Router();
const telegramBot = TelegramBotService.getInstance();

// ==================== 类型定义 ====================

interface WithdrawalApprovalRequest {
  action: "approve" | "reject";
  reason?: string;
  adminId?: number;
  adminName?: string;
}

interface FinancialVoucher {
  voucherNo: string;
  type: "WITHDRAWAL" | "REFUND" | "SETTLEMENT";
  amount: number;
  currency: string;
  description: { ru: string; zh: string };
  relatedId: number;
  createdAt: Date;
}

// ==================== 工具函数 ====================

function generateVoucherNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FV-${dateStr}-${random}`;
}

function generateTransactionId(): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

// ==================== 提现列表 ====================

router.get("/withdrawals", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { status, page = "1", limit = "20", startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(withdrawalRequests.status, status as any));
    }
    if (startDate) {
      conditions.push(
        gte(withdrawalRequests.createdAt, new Date(startDate as string))
      );
    }
    if (endDate) {
      conditions.push(
        lte(withdrawalRequests.createdAt, new Date(endDate as string))
      );
    }

    // 查询提现记录
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const withdrawals = await db
      .select({
        id: withdrawalRequests.id,
        influencerId: withdrawalRequests.influencerId,
        amount: withdrawalRequests.amount,
        bankInfo: withdrawalRequests.bankInfo,
        status: withdrawalRequests.status,
        processedBy: withdrawalRequests.processedBy,
        processedAt: withdrawalRequests.processedAt,
        rejectReason: withdrawalRequests.rejectReason,
        transactionId: withdrawalRequests.transactionId,
        voucherPdfUrl: withdrawalRequests.voucherPdfUrl,
        createdAt: withdrawalRequests.createdAt,
        updatedAt: withdrawalRequests.updatedAt,
      })
      .from(withdrawalRequests)
      .where(whereClause)
      .orderBy(desc(withdrawalRequests.createdAt))
      .limit(limitNum)
      .offset(offset);

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawalRequests)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // 获取达人信息
    const influencerIds = Array.from(
      new Set(withdrawals.map((w: (typeof withdrawals)[0]) => w.influencerId))
    );
    let influencerMap: Record<number, any> = {};

    if (influencerIds.length > 0) {
      const influencerList = await db
        .select()
        .from(influencers)
        .where(
          sql`${influencers.id} IN (${sql.join(
            influencerIds.map((id: number) => sql`${id}`),
            sql`, `
          )})`
        );

      // 获取用户信息
      const userIds = influencerList
        .map((i: (typeof influencerList)[0]) => i.userId)
        .filter(Boolean) as number[];
      let userMap: Record<number, any> = {};

      if (userIds.length > 0) {
        const userList = await db
          .select()
          .from(users)
          .where(
            sql`${users.id} IN (${sql.join(
              userIds.map((id: number) => sql`${id}`),
              sql`, `
            )})`
          );

        userMap = userList.reduce(
          (acc: Record<number, any>, u: (typeof userList)[0]) => {
            acc[u.id] = u;
            return acc;
          },
          {} as Record<number, any>
        );
      }

      influencerMap = influencerList.reduce(
        (acc: Record<number, any>, inf: (typeof influencerList)[0]) => {
          acc[inf.id] = {
            ...inf,
            user: inf.userId ? userMap[inf.userId] : null,
          };
          return acc;
        },
        {} as Record<number, any>
      );
    }

    // 组装返回数据
    const data = withdrawals.map((w: (typeof withdrawals)[0]) => ({
      ...w,
      influencer: influencerMap[w.influencerId] || null,
    }));

    // 统计数据
    const statsResult = await db
      .select({
        status: withdrawalRequests.status,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${withdrawalRequests.amount})`,
      })
      .from(withdrawalRequests)
      .groupBy(withdrawalRequests.status);

    const stats = {
      pending: { count: 0, total: 0 },
      processing: { count: 0, total: 0 },
      completed: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 },
    };

    statsResult.forEach(
      (s: { status: string | null; count: number; total: number }) => {
        const key = s.status?.toLowerCase() as keyof typeof stats;
        if (stats[key]) {
          stats[key] = {
            count: Number(s.count) || 0,
            total: Number(s.total) || 0,
          };
        }
      }
    );

    res.json({
      success: true,
      data: {
        withdrawals: data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        stats,
      },
    });
  } catch (error: any) {
    console.error("[Finance] Get withdrawals error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get withdrawals" },
    });
  }
});

// ==================== 提现详情 ====================

router.get("/withdrawals/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { id } = req.params;

    const withdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, parseInt(id)))
      .limit(1);

    if (!withdrawal.length) {
      return res.status(404).json({
        success: false,
        error: { message: "Withdrawal not found" },
      });
    }

    // 获取达人信息
    const influencer = await db
      .select()
      .from(influencers)
      .where(eq(influencers.id, withdrawal[0].influencerId))
      .limit(1);

    let user = null;
    if (influencer.length && influencer[0].userId) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, influencer[0].userId))
        .limit(1);
      user = userResult[0] || null;
    }

    res.json({
      success: true,
      data: {
        ...withdrawal[0],
        influencer: influencer[0] || null,
        user,
      },
    });
  } catch (error: any) {
    console.error("[Finance] Get withdrawal detail error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get withdrawal detail" },
    });
  }
});

// ==================== 提现审批 ====================

router.post("/withdrawals/:id/approve", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { id } = req.params;
    const { action, reason, adminId, adminName } =
      req.body as WithdrawalApprovalRequest;

    // 获取提现记录
    const withdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, parseInt(id)))
      .limit(1);

    if (!withdrawal.length) {
      return res.status(404).json({
        success: false,
        error: { message: "Withdrawal not found" },
      });
    }

    if (withdrawal[0].status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: { message: "Withdrawal is not in pending status" },
      });
    }

    const now = new Date();
    let newStatus: "PROCESSING" | "REJECTED";
    let transactionId: string | null = null;
    let voucher: FinancialVoucher | null = null;

    if (action === "approve") {
      newStatus = "PROCESSING";
      transactionId = generateTransactionId();

      // 生成财务凭证
      voucher = {
        voucherNo: generateVoucherNo(),
        type: "WITHDRAWAL",
        amount: Number(withdrawal[0].amount),
        currency: "RUB",
        description: {
          ru: `Вывод средств инфлюенсера #${withdrawal[0].influencerId}`,
          zh: `达人 #${withdrawal[0].influencerId} 提现`,
        },
        relatedId: withdrawal[0].id,
        createdAt: now,
      };

      // 生成并上传PDF凭证
      let voucherPdfUrl: string | null = null;
      try {
        const pdfResult = await generateAndUploadVoucherPdf({
          voucherNo: voucher.voucherNo,
          type: voucher.type,
          amount: voucher.amount,
          currency: voucher.currency,
          recipientName: `Инфлюенсер #${withdrawal[0].influencerId}`,
          transactionId,
          status: newStatus,
          operatorName: adminName || "Admin",
          description: voucher.description,
          createdAt: now,
        });
        voucherPdfUrl = pdfResult.url;
        console.log(`[Finance] Voucher PDF uploaded: ${voucherPdfUrl}`);
      } catch (pdfError) {
        console.error("[Finance] Failed to generate voucher PDF:", pdfError);
      }

      // 更新提现记录（包含凭证URL）
      await db
        .update(withdrawalRequests)
        .set({
          status: newStatus,
          processedBy: adminId || 1,
          processedAt: now,
          transactionId,
          voucherPdfUrl,
          updatedAt: now,
        })
        .where(eq(withdrawalRequests.id, parseInt(id)));

      // 记录审计日志
      await db.insert(auditLogs).values({
        tableName: "withdrawal_requests",
        recordId: parseInt(id),
        action: "UPDATE",
        diffBefore: { status: "PENDING" },
        diffAfter: { status: newStatus, transactionId, voucher },
        operatorId: adminId || 1,
        operatorType: "ADMIN",
        operatorName: adminName || "Admin",
        reason: "Withdrawal approved",
      });

      // 发送 Telegram 通知
      try {
        await telegramBot.sendNotification({
          type: "WITHDRAW_REQUEST",
          data: {
            withdrawalId: withdrawal[0].id,
            influencerId: withdrawal[0].influencerId,
            amount: Number(withdrawal[0].amount),
            status: "approved",
            transactionId,
            adminName: adminName || "Admin",
          },
        });
      } catch (tgError) {
        console.error("[Finance] Telegram notification error:", tgError);
      }
    } else {
      newStatus = "REJECTED";

      // 更新提现记录
      await db
        .update(withdrawalRequests)
        .set({
          status: newStatus,
          processedBy: adminId || 1,
          processedAt: now,
          rejectReason: reason || "Rejected by admin",
          updatedAt: now,
        })
        .where(eq(withdrawalRequests.id, parseInt(id)));

      // 记录审计日志
      await db.insert(auditLogs).values({
        tableName: "withdrawal_requests",
        recordId: parseInt(id),
        action: "UPDATE",
        diffBefore: { status: "PENDING" },
        diffAfter: { status: newStatus, rejectReason: reason },
        operatorId: adminId || 1,
        operatorType: "ADMIN",
        operatorName: adminName || "Admin",
        reason: reason || "Withdrawal rejected",
      });

      // 发送 Telegram 通知
      try {
        await telegramBot.sendNotification({
          type: "WITHDRAW_REQUEST",
          data: {
            withdrawalId: withdrawal[0].id,
            influencerId: withdrawal[0].influencerId,
            amount: Number(withdrawal[0].amount),
            status: "rejected",
            reason: reason || "Rejected by admin",
            adminName: adminName || "Admin",
          },
        });
      } catch (tgError) {
        console.error("[Finance] Telegram notification error:", tgError);
      }
    }

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        status: newStatus,
        transactionId,
        voucher,
        processedAt: now,
        message:
          action === "approve"
            ? { ru: "Заявка одобрена", zh: "申请已批准" }
            : { ru: "Заявка отклонена", zh: "申请已拒绝" },
      },
    });
  } catch (error: any) {
    console.error("[Finance] Approve withdrawal error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to process withdrawal" },
    });
  }
});

// ==================== 完成提现 ====================

router.post(
  "/withdrawals/:id/complete",
  async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          success: false,
          error: { message: "Database not available" },
        });
      }

      const { id } = req.params;
      const { adminId, adminName } = req.body;

      // 获取提现记录
      const withdrawal = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, parseInt(id)))
        .limit(1);

      if (!withdrawal.length) {
        return res.status(404).json({
          success: false,
          error: { message: "Withdrawal not found" },
        });
      }

      if (withdrawal[0].status !== "PROCESSING") {
        return res.status(400).json({
          success: false,
          error: { message: "Withdrawal is not in processing status" },
        });
      }

      const now = new Date();

      // 更新提现记录
      await db
        .update(withdrawalRequests)
        .set({
          status: "COMPLETED",
          updatedAt: now,
        })
        .where(eq(withdrawalRequests.id, parseInt(id)));

      // 记录审计日志
      await db.insert(auditLogs).values({
        tableName: "withdrawal_requests",
        recordId: parseInt(id),
        action: "UPDATE",
        diffBefore: { status: "PROCESSING" },
        diffAfter: { status: "COMPLETED" },
        operatorId: adminId || 1,
        operatorType: "ADMIN",
        operatorName: adminName || "Admin",
        reason: "Withdrawal completed",
      });

      res.json({
        success: true,
        data: {
          id: parseInt(id),
          status: "COMPLETED",
          completedAt: now,
          message: { ru: "Вывод завершён", zh: "提现已完成" },
        },
      });
    } catch (error: any) {
      console.error("[Finance] Complete withdrawal error:", error);
      res.status(500).json({
        success: false,
        error: { message: error.message || "Failed to complete withdrawal" },
      });
    }
  }
);

// ==================== 财务凭证列表 ====================

router.get("/vouchers", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { page = "1", limit = "20" } = req.query;

    // 从审计日志中获取财务凭证
    const vouchers = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tableName, "withdrawal_requests"),
          eq(auditLogs.action, "UPDATE")
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    // 提取凭证信息
    const voucherList = vouchers
      .filter((v: (typeof vouchers)[0]) => {
        const after = v.diffAfter as any;
        return after?.voucher;
      })
      .map((v: (typeof vouchers)[0]) => {
        const after = v.diffAfter as any;
        return {
          ...after.voucher,
          auditLogId: v.id,
          operatorName: v.operatorName,
        };
      });

    res.json({
      success: true,
      data: {
        vouchers: voucherList,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: voucherList.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[Finance] Get vouchers error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get vouchers" },
    });
  }
});

// ==================== 财务统计 ====================

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    // 提现统计
    const withdrawalStats = (await db
      .select({
        status: withdrawalRequests.status,
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(sum(${withdrawalRequests.amount}), 0)`,
      })
      .from(withdrawalRequests)
      .groupBy(withdrawalRequests.status)) as {
      status: string | null;
      count: number;
      total: number;
    }[];

    // 今日提现
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawals = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(sum(${withdrawalRequests.amount}), 0)`,
      })
      .from(withdrawalRequests)
      .where(gte(withdrawalRequests.createdAt, today));

    // 待审批金额
    const pendingAmount =
      withdrawalStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "PENDING"
      )?.total || 0;
    const pendingCount =
      withdrawalStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "PENDING"
      )?.count || 0;

    // 已完成金额
    const completedAmount =
      withdrawalStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "COMPLETED"
      )?.total || 0;
    const completedCount =
      withdrawalStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "COMPLETED"
      )?.count || 0;

    res.json({
      success: true,
      data: {
        pending: {
          count: Number(pendingCount),
          amount: Number(pendingAmount),
        },
        completed: {
          count: Number(completedCount),
          amount: Number(completedAmount),
        },
        today: {
          count: Number(todayWithdrawals[0]?.count || 0),
          amount: Number(todayWithdrawals[0]?.total || 0),
        },
        byStatus: withdrawalStats.map(
          (s: { status: string | null; count: number; total: number }) => ({
            status: s.status,
            count: Number(s.count),
            amount: Number(s.total),
          })
        ),
      },
    });
  } catch (error: any) {
    console.error("[Finance] Get stats error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get stats" },
    });
  }
});

export default router;
