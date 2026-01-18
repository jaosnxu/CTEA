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
import { getPrismaClient } from "../db/prisma";
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
    const prisma = getPrismaClient();

    const { status, page = "1", limit = "20", startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const whereClause: any = {};
    
    if (status && status !== "all") {
      whereClause.status = status as string;
    }
    
    if (startDate) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: new Date(startDate as string),
      };
    }
    
    if (endDate) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(endDate as string),
      };
    }

    // 查询提现记录
    const withdrawals = await prisma.withdrawalrequests.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip: offset,
    });

    // 获取总数
    const total = await prisma.withdrawalrequests.count({
      where: whereClause,
    });

    // 获取达人信息
    const influencerIds = Array.from(
      new Set(withdrawals.map((w) => w.influencerId))
    );
    let influencerMap: Record<number, any> = {};

    if (influencerIds.length > 0) {
      const influencerList = await prisma.influencers.findMany({
        where: {
          userId: { in: influencerIds },
        },
      });

      // 获取用户信息
      const userIds = influencerList
        .map((i) => i.userId)
        .filter(Boolean) as number[];
      let userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const userList = await prisma.users.findMany({
          where: {
            id: { in: userIds.map(String) },
          },
        });

        userMap = userList.reduce(
          (acc: Record<string, any>, u) => {
            acc[u.id] = u;
            return acc;
          },
          {} as Record<string, any>
        );
      }

      influencerMap = influencerList.reduce(
        (acc: Record<number, any>, inf) => {
          acc[inf.userId] = {
            ...inf,
            user: inf.userId ? userMap[String(inf.userId)] : null,
          };
          return acc;
        },
        {} as Record<number, any>
      );
    }

    // 组装返回数据
    const data = withdrawals.map((w) => ({
      ...w,
      influencer: influencerMap[w.influencerId] || null,
    }));

    // 统计数据 - Get stats by status
    const statsByStatus = await prisma.withdrawalrequests.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    });

    const stats = {
      pending: { 
        count: statsByStatus.find(s => s.status === "PENDING")?._count.id || 0,
        total: Number(statsByStatus.find(s => s.status === "PENDING")?._sum.amount || 0)
      },
      processing: { 
        count: statsByStatus.find(s => s.status === "PROCESSING")?._count.id || 0,
        total: Number(statsByStatus.find(s => s.status === "PROCESSING")?._sum.amount || 0)
      },
      completed: { 
        count: statsByStatus.find(s => s.status === "COMPLETED")?._count.id || 0,
        total: Number(statsByStatus.find(s => s.status === "COMPLETED")?._sum.amount || 0)
      },
      rejected: { 
        count: statsByStatus.find(s => s.status === "REJECTED")?._count.id || 0,
        total: Number(statsByStatus.find(s => s.status === "REJECTED")?._sum.amount || 0)
      },
    };

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
    const prisma = getPrismaClient();

    const { id } = req.params;

    const withdrawal = await prisma.withdrawalrequests.findFirst({
      where: { id: parseInt(id) },
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: { message: "Withdrawal not found" },
      });
    }

    // 获取达人信息
    const influencer = await prisma.influencers.findFirst({
      where: { userId: withdrawal.influencerId },
    });

    let user = null;
    if (influencer && influencer.userId) {
      user = await prisma.users.findFirst({
        where: { id: String(influencer.userId) },
      });
    }

    res.json({
      success: true,
      data: {
        ...withdrawal,
        influencer: influencer || null,
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
    const prisma = getPrismaClient();

    const { id } = req.params;
    const { action, reason, adminId, adminName } =
      req.body as WithdrawalApprovalRequest;

    // 获取提现记录
    const withdrawal = await prisma.withdrawalrequests.findFirst({
      where: { id: parseInt(id) },
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: { message: "Withdrawal not found" },
      });
    }

    if (withdrawal.status !== "PENDING") {
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
        amount: Number(withdrawal.amount),
        currency: "RUB",
        description: {
          ru: `Вывод средств инфлюенсера #${withdrawal.influencerId}`,
          zh: `达人 #${withdrawal.influencerId} 提现`,
        },
        relatedId: withdrawal.id,
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
          recipientName: `Инфлюенсер #${withdrawal.influencerId}`,
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
      await prisma.withdrawalrequests.update({
        where: { id: parseInt(id) },
        data: {
          status: newStatus,
          processedBy: adminId || 1,
          processedAt: now,
          transactionId,
          voucherPdfUrl,
          updatedAt: now,
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          tableName: "withdrawal_requests",
          recordId: String(parseInt(id)),
          action: "UPDATE",
          diffBefore: { status: "PENDING" },
          diffAfter: { status: newStatus, transactionId, voucher },
          operatorId: String(adminId || 1),
          operatorType: "ADMIN",
          operatorName: adminName || "Admin",
          reason: "Withdrawal approved",
        },
      });

      // 发送 Telegram 通知
      try {
        await telegramBot.sendNotification({
          type: "WITHDRAW_REQUEST",
          data: {
            withdrawalId: withdrawal.id,
            influencerId: withdrawal.influencerId,
            amount: Number(withdrawal.amount),
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
      await prisma.withdrawalrequests.update({
        where: { id: parseInt(id) },
        data: {
          status: newStatus,
          processedBy: adminId || 1,
          processedAt: now,
          rejectReason: reason || "Rejected by admin",
          updatedAt: now,
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          tableName: "withdrawal_requests",
          recordId: String(parseInt(id)),
          action: "UPDATE",
          diffBefore: { status: "PENDING" },
          diffAfter: { status: newStatus, rejectReason: reason },
          operatorId: String(adminId || 1),
          operatorType: "ADMIN",
          operatorName: adminName || "Admin",
          reason: reason || "Withdrawal rejected",
        },
      });

      // 发送 Telegram 通知
      try {
        await telegramBot.sendNotification({
          type: "WITHDRAW_REQUEST",
          data: {
            withdrawalId: withdrawal.id,
            influencerId: withdrawal.influencerId,
            amount: Number(withdrawal.amount),
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
      const prisma = getPrismaClient();

      const { id } = req.params;
      const { adminId, adminName } = req.body;

      // 获取提现记录
      const withdrawal = await prisma.withdrawalrequests.findFirst({
        where: { id: parseInt(id) },
      });

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          error: { message: "Withdrawal not found" },
        });
      }

      if (withdrawal.status !== "PROCESSING") {
        return res.status(400).json({
          success: false,
          error: { message: "Withdrawal is not in processing status" },
        });
      }

      const now = new Date();

      // 更新提现记录
      await prisma.withdrawalrequests.update({
        where: { id: parseInt(id) },
        data: {
          status: "COMPLETED",
          updatedAt: now,
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          tableName: "withdrawal_requests",
          recordId: String(parseInt(id)),
          action: "UPDATE",
          diffBefore: { status: "PROCESSING" },
          diffAfter: { status: "COMPLETED" },
          operatorId: String(adminId || 1),
          operatorType: "ADMIN",
          operatorName: adminName || "Admin",
          reason: "Withdrawal completed",
        },
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
    const prisma = getPrismaClient();

    const { page = "1", limit = "20" } = req.query;

    // 从审计日志中获取财务凭证
    const vouchers = await prisma.auditLog.findMany({
      where: {
        tableName: "withdrawal_requests",
        action: "UPDATE",
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    // 提取凭证信息
    const voucherList = vouchers
      .filter((v) => {
        const after = v.diffAfter as any;
        return after?.voucher;
      })
      .map((v) => {
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
    const prisma = getPrismaClient();

    // 提现统计
    const withdrawalStats = await prisma.withdrawalrequests.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    });

    const formattedStats = withdrawalStats.map((s) => ({
      status: s.status,
      count: s._count.id,
      total: Number(s._sum.amount || 0),
    }));

    // 今日提现
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawals = await prisma.withdrawalrequests.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: {
        createdAt: { gte: today },
      },
    });

    // 待审批金额
    const pendingAmount =
      formattedStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "PENDING"
      )?.total || 0;
    const pendingCount =
      formattedStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "PENDING"
      )?.count || 0;

    // 已完成金额
    const completedAmount =
      formattedStats.find(
        (s: { status: string | null; count: number; total: number }) =>
          s.status === "COMPLETED"
      )?.total || 0;
    const completedCount =
      formattedStats.find(
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
          count: Number(todayWithdrawals._count.id || 0),
          amount: Number(todayWithdrawals._sum.amount || 0),
        },
        byStatus: formattedStats.map(
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
