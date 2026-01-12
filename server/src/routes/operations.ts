/**
 * CHUTEA 智慧中台 - 运营模块 API
 *
 * 功能：
 * 1. SKU 原子化管理
 * 2. 门店配置
 * 3. 库存管理
 * 4. Android TV 菜单开关
 */

import { Router, Request, Response } from "express";
import { getDb } from "../../db";
import { products, stores, auditLogs } from "../../../drizzle/schema";
import { eq, desc, and, sql, like } from "drizzle-orm";

const router = Router();

// ==================== 类型定义 ====================

interface SKUConfig {
  id: number;
  code: string;
  name: { ru: string; zh: string };
  category: string;
  basePrice: number;
  cost: number;
  unit: string;
  isActive: boolean;
  isAvailableOnTV: boolean;
  isAvailableOnApp: boolean;
  isAvailableOnWeb: boolean;
  stockQuantity: number;
  minStock: number;
  maxStock: number;
  storeId: number | null;
  attributes: {
    size?: string;
    color?: string;
    flavor?: string;
    temperature?: "hot" | "cold" | "both";
    sugarLevel?: string[];
    toppings?: string[];
  };
}

interface StoreConfig {
  id: number;
  code: string;
  name: { ru: string; zh: string };
  address: { ru: string; zh: string };
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  businessHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  tvEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
}

// ==================== SKU 列表 ====================

router.get("/skus", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { page = "1", limit = "20", category, search, storeId } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const conditions = [];
    if (category) {
      conditions.push(eq(products.categoryId, parseInt(category as string)));
    }
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询 SKU
    const skuList = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limitNum)
      .offset(offset);

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // 转换为 SKU 格式
    const skus = skuList.map((p: (typeof skuList)[0]) => ({
      id: p.id,
      code: `SKU-${p.id.toString().padStart(6, "0")}`,
      name: typeof p.name === "string" ? { ru: p.name, zh: p.name } : p.name,
      category: String(p.categoryId),
      basePrice: Number(p.basePrice),
      cost: Number(p.basePrice) * 0.4, // 模拟成本
      unit: "шт",
      isActive: p.isActive ?? true,
      isAvailableOnTV: true,
      isAvailableOnApp: true,
      isAvailableOnWeb: true,
      stockQuantity: 100, // 模拟库存
      minStock: 10,
      maxStock: 500,
      storeId: null,
      attributes: {
        temperature: "both",
        sugarLevel: ["0%", "30%", "50%", "70%", "100%"],
      },
    }));

    res.json({
      success: true,
      data: {
        skus,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("[Operations] Get SKUs error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get SKUs" },
    });
  }
});

// ==================== SKU 详情 ====================

router.get("/skus/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { id } = req.params;

    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (!product.length) {
      return res.status(404).json({
        success: false,
        error: { message: "SKU not found" },
      });
    }

    const p = product[0];
    const sku = {
      id: p.id,
      code: `SKU-${p.id.toString().padStart(6, "0")}`,
      name: typeof p.name === "string" ? { ru: p.name, zh: p.name } : p.name,
      category: String(p.categoryId),
      basePrice: Number(p.basePrice),
      cost: Number(p.basePrice) * 0.4,
      unit: "шт",
      isActive: p.isActive ?? true,
      isAvailableOnTV: true,
      isAvailableOnApp: true,
      isAvailableOnWeb: true,
      stockQuantity: 100,
      minStock: 10,
      maxStock: 500,
      storeId: null,
      attributes: {
        temperature: "both",
        sugarLevel: ["0%", "30%", "50%", "70%", "100%"],
      },
    };

    res.json({
      success: true,
      data: sku,
    });
  } catch (error: any) {
    console.error("[Operations] Get SKU detail error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get SKU detail" },
    });
  }
});

// ==================== 更新 SKU ====================

router.put("/skus/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { id } = req.params;
    const {
      isActive,
      isAvailableOnTV,
      isAvailableOnApp,
      isAvailableOnWeb,
      adminId,
      adminName,
    } = req.body;

    const now = new Date();

    // 更新产品
    await db
      .update(products)
      .set({
        isActive: isActive ?? true,
        updatedAt: now,
      })
      .where(eq(products.id, parseInt(id)));

    // 记录审计日志
    await db.insert(auditLogs).values({
      tableName: "products",
      recordId: parseInt(id),
      action: "UPDATE",
      diffBefore: {},
      diffAfter: {
        isActive,
        isAvailableOnTV,
        isAvailableOnApp,
        isAvailableOnWeb,
      },
      operatorId: adminId || 1,
      operatorType: "ADMIN",
      operatorName: adminName || "Admin",
      reason: "Updated SKU availability",
    });

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        isActive,
        isAvailableOnTV,
        isAvailableOnApp,
        isAvailableOnWeb,
        message: { ru: "SKU обновлён", zh: "SKU 已更新" },
      },
    });
  } catch (error: any) {
    console.error("[Operations] Update SKU error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to update SKU" },
    });
  }
});

// ==================== 门店列表 ====================

router.get("/stores", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const storeList = await db
      .select()
      .from(stores)
      .orderBy(desc(stores.createdAt));

    // 转换为门店配置格式
    const storeConfigs = storeList.map((s: (typeof storeList)[0]) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      phone: s.phone,
      status: s.status,
      businessHours: s.businessHours || {
        monday: { open: "09:00", close: "22:00" },
        tuesday: { open: "09:00", close: "22:00" },
        wednesday: { open: "09:00", close: "22:00" },
        thursday: { open: "09:00", close: "22:00" },
        friday: { open: "09:00", close: "22:00" },
        saturday: { open: "10:00", close: "23:00" },
        sunday: { open: "10:00", close: "23:00" },
      },
      tvEnabled: true,
      deliveryEnabled: true,
      pickupEnabled: true,
    }));

    res.json({
      success: true,
      data: storeConfigs,
    });
  } catch (error: any) {
    console.error("[Operations] Get stores error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get stores" },
    });
  }
});

// ==================== 更新门店配置 ====================

router.put("/stores/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    const { id } = req.params;
    const {
      status,
      businessHours,
      tvEnabled,
      deliveryEnabled,
      pickupEnabled,
      adminId,
      adminName,
    } = req.body;

    const now = new Date();

    // 更新门店
    await db
      .update(stores)
      .set({
        status: status || "ACTIVE",
        businessHours: businessHours,
        updatedAt: now,
      })
      .where(eq(stores.id, parseInt(id)));

    // 记录审计日志
    await db.insert(auditLogs).values({
      tableName: "stores",
      recordId: parseInt(id),
      action: "UPDATE",
      diffBefore: {},
      diffAfter: {
        status,
        businessHours,
        tvEnabled,
        deliveryEnabled,
        pickupEnabled,
      },
      operatorId: adminId || 1,
      operatorType: "ADMIN",
      operatorName: adminName || "Admin",
      reason: "Updated store configuration",
    });

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        status,
        message: { ru: "Магазин обновлён", zh: "门店已更新" },
      },
    });
  } catch (error: any) {
    console.error("[Operations] Update store error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to update store" },
    });
  }
});

// ==================== 库存预警 ====================

router.get("/inventory/alerts", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    // 模拟库存预警数据
    const alerts = [
      {
        id: 1,
        skuCode: "SKU-000001",
        skuName: { ru: "Классический молочный чай", zh: "经典奶茶" },
        currentStock: 5,
        minStock: 10,
        status: "LOW",
        storeId: 1,
        storeName: { ru: "Москва - Центр", zh: "莫斯科中心店" },
      },
      {
        id: 2,
        skuCode: "SKU-000003",
        skuName: { ru: "Тапиока", zh: "珍珠" },
        currentStock: 3,
        minStock: 20,
        status: "CRITICAL",
        storeId: 1,
        storeName: { ru: "Москва - Центр", zh: "莫斯科中心店" },
      },
    ];

    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(
            (a: (typeof alerts)[0]) => a.status === "CRITICAL"
          ).length,
          low: alerts.filter((a: (typeof alerts)[0]) => a.status === "LOW")
            .length,
        },
      },
    });
  } catch (error: any) {
    console.error("[Operations] Get inventory alerts error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get inventory alerts" },
    });
  }
});

// ==================== 运营统计 ====================

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: { message: "Database not available" },
      });
    }

    // SKU 统计
    const skuCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products);

    const activeSkuCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));

    // 门店统计
    const storeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(stores);

    const activeStoreCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(stores)
      .where(eq(stores.status, "ACTIVE"));

    res.json({
      success: true,
      data: {
        skus: {
          total: Number(skuCount[0]?.count || 0),
          active: Number(activeSkuCount[0]?.count || 0),
        },
        stores: {
          total: Number(storeCount[0]?.count || 0),
          active: Number(activeStoreCount[0]?.count || 0),
        },
        inventory: {
          alerts: 2,
          critical: 1,
        },
      },
    });
  } catch (error: any) {
    console.error("[Operations] Get stats error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get stats" },
    });
  }
});

export default router;
