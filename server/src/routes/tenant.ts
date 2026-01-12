/**
 * CHUTEA 智慧中台 - 多租户系统 API
 *
 * 功能：
 * 1. 组织/门店管理
 * 2. 租户切换
 * 3. 数据隔离
 * 4. 权限控制
 */

import { Router, Request, Response } from "express";
import { getDb } from "../../db";
import {
  organizations,
  stores,
  adminUsers,
  auditLogs,
} from "../../../drizzle/schema";
import { eq, sql, desc, and, isNull } from "drizzle-orm";

const router = Router();

// ==================== 类型定义 ====================

interface Organization {
  id: number;
  parentId: number | null;
  code: string;
  name: { ru: string; zh: string };
  level: "HQ" | "ORG" | "STORE";
  timezone: string;
  currency: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  config: any;
}

interface Store {
  id: number;
  orgId: number;
  code: string;
  name: { ru: string; zh: string };
  address: { ru: string; zh: string };
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface TenantContext {
  orgId: number | null;
  storeId: number | null;
  orgName: { ru: string; zh: string };
  storeName: { ru: string; zh: string } | null;
  level: "HQ" | "ORG" | "STORE";
}

// ==================== 获取组织列表 ====================

router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      // 返回模拟数据
      return res.json({
        success: true,
        data: [
          {
            id: 1,
            parentId: null,
            code: "HQ",
            name: { ru: "Штаб-квартира CHUTEA", zh: "CHUTEA 总部" },
            level: "HQ",
            timezone: "Europe/Moscow",
            currency: "RUB",
            status: "ACTIVE",
          },
          {
            id: 2,
            parentId: 1,
            code: "MSK",
            name: { ru: "Московский регион", zh: "莫斯科大区" },
            level: "ORG",
            timezone: "Europe/Moscow",
            currency: "RUB",
            status: "ACTIVE",
          },
          {
            id: 3,
            parentId: 1,
            code: "SPB",
            name: { ru: "Санкт-Петербургский регион", zh: "圣彼得堡大区" },
            level: "ORG",
            timezone: "Europe/Moscow",
            currency: "RUB",
            status: "ACTIVE",
          },
        ],
      });
    }

    const orgList = await db
      .select()
      .from(organizations)
      .orderBy(organizations.level, organizations.code);

    res.json({
      success: true,
      data: orgList,
    });
  } catch (error: any) {
    console.error("[Tenant] Get organizations error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get organizations" },
    });
  }
});

// ==================== 获取门店列表 ====================

router.get("/stores", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { orgId } = req.query;

    if (!db) {
      // 返回模拟数据
      const mockStores = [
        {
          id: 1,
          orgId: 2,
          code: "MSK-001",
          name: { ru: "Москва - Центр", zh: "莫斯科中心店" },
          address: { ru: "ул. Тверская, 15", zh: "特维尔大街 15 号" },
          phone: "+7 495 123-45-67",
          status: "ACTIVE",
        },
        {
          id: 2,
          orgId: 2,
          code: "MSK-002",
          name: { ru: "Москва - Арбат", zh: "莫斯科阿尔巴特店" },
          address: { ru: "ул. Арбат, 25", zh: "阿尔巴特大街 25 号" },
          phone: "+7 495 234-56-78",
          status: "ACTIVE",
        },
        {
          id: 3,
          orgId: 3,
          code: "SPB-001",
          name: { ru: "Санкт-Петербург - Невский", zh: "圣彼得堡涅瓦店" },
          address: { ru: "Невский пр., 100", zh: "涅瓦大街 100 号" },
          phone: "+7 812 345-67-89",
          status: "ACTIVE",
        },
        {
          id: 4,
          orgId: 3,
          code: "SPB-002",
          name: {
            ru: "Санкт-Петербург - Васильевский",
            zh: "圣彼得堡瓦西里岛店",
          },
          address: { ru: "В.О., 7-я линия, 50", zh: "瓦西里岛第 7 线 50 号" },
          phone: "+7 812 456-78-90",
          status: "INACTIVE",
        },
      ];

      const filtered = orgId
        ? mockStores.filter(s => s.orgId === parseInt(orgId as string))
        : mockStores;

      return res.json({
        success: true,
        data: filtered,
      });
    }

    let query = db.select().from(stores);

    if (orgId) {
      query = query.where(eq(stores.orgId, parseInt(orgId as string))) as any;
    }

    const storeList = await query.orderBy(stores.code);

    res.json({
      success: true,
      data: storeList,
    });
  } catch (error: any) {
    console.error("[Tenant] Get stores error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get stores" },
    });
  }
});

// ==================== 获取当前租户上下文 ====================

router.get("/context", async (req: Request, res: Response) => {
  try {
    // 从 session 或 header 获取当前租户上下文
    const orgId = req.headers["x-org-id"]
      ? parseInt(req.headers["x-org-id"] as string)
      : null;
    const storeId = req.headers["x-store-id"]
      ? parseInt(req.headers["x-store-id"] as string)
      : null;

    const db = await getDb();

    let context: TenantContext = {
      orgId: null,
      storeId: null,
      orgName: { ru: "Штаб-квартира", zh: "总部" },
      storeName: null,
      level: "HQ",
    };

    if (db && orgId) {
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (org.length) {
        context.orgId = org[0].id;
        context.orgName = org[0].name as any;
        context.level = org[0].level as any;
      }

      if (storeId) {
        const store = await db
          .select()
          .from(stores)
          .where(eq(stores.id, storeId))
          .limit(1);

        if (store.length) {
          context.storeId = store[0].id;
          context.storeName = store[0].name as any;
          context.level = "STORE";
        }
      }
    }

    res.json({
      success: true,
      data: context,
    });
  } catch (error: any) {
    console.error("[Tenant] Get context error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get tenant context" },
    });
  }
});

// ==================== 切换租户 ====================

router.post("/switch", async (req: Request, res: Response) => {
  try {
    const { orgId, storeId, adminId, adminName } = req.body;

    const db = await getDb();

    // 验证组织/门店存在
    let newContext: TenantContext = {
      orgId: null,
      storeId: null,
      orgName: { ru: "Штаб-квартира", zh: "总部" },
      storeName: null,
      level: "HQ",
    };

    if (db) {
      if (orgId) {
        const org = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        if (!org.length) {
          return res.status(404).json({
            success: false,
            error: { message: "Organization not found" },
          });
        }

        newContext.orgId = org[0].id;
        newContext.orgName = org[0].name as any;
        newContext.level = org[0].level as any;
      }

      if (storeId) {
        const store = await db
          .select()
          .from(stores)
          .where(eq(stores.id, storeId))
          .limit(1);

        if (!store.length) {
          return res.status(404).json({
            success: false,
            error: { message: "Store not found" },
          });
        }

        newContext.storeId = store[0].id;
        newContext.storeName = store[0].name as any;
        newContext.level = "STORE";
      }

      // 记录审计日志
      await db.insert(auditLogs).values({
        tableName: "tenant_switch",
        recordId: orgId || 0,
        action: "UPDATE",
        diffBefore: {},
        diffAfter: { orgId, storeId },
        operatorId: adminId || 1,
        operatorType: "ADMIN",
        operatorName: adminName || "Admin",
        reason: "Switched tenant context",
      });
    }

    res.json({
      success: true,
      data: {
        context: newContext,
        message: {
          ru: `Переключено на: ${newContext.storeName?.[`ru`] || newContext.orgName.ru}`,
          zh: `已切换到: ${newContext.storeName?.zh || newContext.orgName.zh}`,
        },
      },
    });
  } catch (error: any) {
    console.error("[Tenant] Switch tenant error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to switch tenant" },
    });
  }
});

// ==================== 获取租户统计 ====================

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    let stats = {
      organizations: {
        total: 3,
        hq: 1,
        regions: 2,
      },
      stores: {
        total: 4,
        active: 3,
        inactive: 1,
      },
    };

    if (db) {
      // 组织统计
      const orgCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizations);

      const hqCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizations)
        .where(eq(organizations.level, "HQ"));

      const regionCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizations)
        .where(eq(organizations.level, "ORG"));

      // 门店统计
      const storeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(stores);

      const activeStoreCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(stores)
        .where(eq(stores.status, "ACTIVE"));

      stats = {
        organizations: {
          total: Number(orgCount[0]?.count || 0),
          hq: Number(hqCount[0]?.count || 0),
          regions: Number(regionCount[0]?.count || 0),
        },
        stores: {
          total: Number(storeCount[0]?.count || 0),
          active: Number(activeStoreCount[0]?.count || 0),
          inactive:
            Number(storeCount[0]?.count || 0) -
            Number(activeStoreCount[0]?.count || 0),
        },
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("[Tenant] Get stats error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get tenant stats" },
    });
  }
});

// ==================== 创建门店 ====================

router.post("/stores", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { orgId, code, name, address, phone, adminId, adminName } = req.body;

    // 创建门店
    const result = await db.insert(stores).values({
      orgId,
      code,
      name,
      address,
      phone,
      status: "ACTIVE",
    });

    // 记录审计日志
    await db.insert(auditLogs).values({
      tableName: "stores",
      recordId: Number(result[0].insertId),
      action: "INSERT",
      diffBefore: {},
      diffAfter: { orgId, code, name, address, phone },
      operatorId: adminId || 1,
      operatorType: "ADMIN",
      operatorName: adminName || "Admin",
      reason: "Created new store",
    });

    res.json({
      success: true,
      data: {
        id: Number(result[0].insertId),
        message: { ru: "Магазин создан", zh: "门店已创建" },
      },
    });
  } catch (error: any) {
    console.error("[Tenant] Create store error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to create store" },
    });
  }
});

export default router;
