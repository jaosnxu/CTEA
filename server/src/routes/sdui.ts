/**
 * CHUTEA 智慧中台 - SDUI (Server-Driven UI) 配置 API
 *
 * 功能：
 * 1. App 首页广告位配置
 * 2. 会员等级权益配置
 * 3. 主题颜色配置
 * 4. Banner 配置
 * 5. 实时配置下发
 */

import { Router, Request, Response } from "express";
import { getPrismaClient } from "../db/prisma";

const router = Router();

// ==================== 类型定义 ====================

interface BannerConfig {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title: { ru: string; zh: string };
  enabled: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
}

interface AdSlotConfig {
  id: string;
  position:
    | "home_top"
    | "home_middle"
    | "home_bottom"
    | "product_detail"
    | "checkout";
  type: "banner" | "card" | "popup";
  content: {
    imageUrl?: string;
    title?: { ru: string; zh: string };
    description?: { ru: string; zh: string };
    linkUrl?: string;
    buttonText?: { ru: string; zh: string };
  };
  enabled: boolean;
  order: number;
}

interface MembershipTier {
  level: number;
  name: { ru: string; zh: string };
  minSpend: number;
  benefits: {
    pointsMultiplier: number;
    discountPercent: number;
    freeDelivery: boolean;
    prioritySupport: boolean;
    birthdayBonus: number;
    exclusiveProducts: boolean;
    earlyAccess: boolean;
  };
  icon: string;
  color: string;
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerStyle: "light" | "dark" | "gradient";
  buttonStyle: "rounded" | "square" | "pill";
}

interface SDUIConfig {
  banners: BannerConfig[];
  adSlots: AdSlotConfig[];
  membershipTiers: MembershipTier[];
  theme: ThemeConfig;
  features: {
    showBanners: boolean;
    showAdSlots: boolean;
    enableMembership: boolean;
    enablePoints: boolean;
    enableCoupons: boolean;
    enableReferral: boolean;
  };
  version: number;
  updatedAt: string;
}

// ==================== 默认配置 ====================

const defaultMembershipTiers: MembershipTier[] = [
  {
    level: 1,
    name: { ru: "Бронза", zh: "青铜" },
    minSpend: 0,
    benefits: {
      pointsMultiplier: 1,
      discountPercent: 0,
      freeDelivery: false,
      prioritySupport: false,
      birthdayBonus: 100,
      exclusiveProducts: false,
      earlyAccess: false,
    },
    icon: "🥉",
    color: "#CD7F32",
  },
  {
    level: 2,
    name: { ru: "Серебро", zh: "白银" },
    minSpend: 2000,
    benefits: {
      pointsMultiplier: 1.5,
      discountPercent: 5,
      freeDelivery: false,
      prioritySupport: false,
      birthdayBonus: 200,
      exclusiveProducts: false,
      earlyAccess: false,
    },
    icon: "🥈",
    color: "#C0C0C0",
  },
  {
    level: 3,
    name: { ru: "Золото", zh: "黄金" },
    minSpend: 8000,
    benefits: {
      pointsMultiplier: 2,
      discountPercent: 10,
      freeDelivery: true,
      prioritySupport: true,
      birthdayBonus: 500,
      exclusiveProducts: true,
      earlyAccess: false,
    },
    icon: "🥇",
    color: "#FFD700",
  },
  {
    level: 4,
    name: { ru: "Платина", zh: "铂金" },
    minSpend: 20000,
    benefits: {
      pointsMultiplier: 3,
      discountPercent: 15,
      freeDelivery: true,
      prioritySupport: true,
      birthdayBonus: 1000,
      exclusiveProducts: true,
      earlyAccess: true,
    },
    icon: "💎",
    color: "#E5E4E2",
  },
];

const defaultTheme: ThemeConfig = {
  primaryColor: "#F97316",
  secondaryColor: "#10B981",
  accentColor: "#8B5CF6",
  backgroundColor: "#FFFFFF",
  textColor: "#1F2937",
  headerStyle: "light",
  buttonStyle: "rounded",
};

const defaultBanners: BannerConfig[] = [
  {
    id: "banner-1",
    imageUrl: "/images/banner-1.jpg",
    title: { ru: "Новинки сезона", zh: "当季新品" },
    enabled: true,
    order: 1,
  },
];

const defaultConfig: SDUIConfig = {
  banners: defaultBanners,
  adSlots: [],
  membershipTiers: defaultMembershipTiers,
  theme: defaultTheme,
  features: {
    showBanners: true,
    showAdSlots: true,
    enableMembership: true,
    enablePoints: true,
    enableCoupons: true,
    enableReferral: true,
  },
  version: 1,
  updatedAt: new Date().toISOString(),
};

// ==================== 辅助函数 ====================

async function getConfigValue(key: string): Promise<any> {
  const prisma = getPrismaClient();
  const config = await prisma.systemConfig.findFirst({
    where: {
      configKey: key,
      orgId: null,
      storeId: null,
    },
  });

  return config?.configValue || null;
}

async function setConfigValue(
  key: string,
  value: any,
  description: any
): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();

  // Try to find existing config with the unique constraint
  const existingConfig = await prisma.systemConfig.findFirst({
    where: {
      configKey: key,
      orgId: null,
      storeId: null,
    },
  });

  if (existingConfig) {
    // Update existing config
    await prisma.systemConfig.update({
      where: { id: existingConfig.id },
      data: {
        configValue: value,
        updatedAt: now,
      },
    });
  } else {
    // Create new config
    await prisma.systemConfig.create({
      data: {
        configKey: key,
        configValue: value,
        valueType: "JSON",
        description,
        orgId: null,
        storeId: null,
        updatedAt: now,
      },
    });
  }
}

// ==================== 获取完整配置 ====================

router.get("/config", async (req: Request, res: Response) => {
  try {
    const config: SDUIConfig = { ...defaultConfig };

    const membershipTiers = await getConfigValue("sdui_membership_tiers");
    if (membershipTiers) config.membershipTiers = membershipTiers;

    const theme = await getConfigValue("sdui_theme");
    if (theme) config.theme = theme;

    const banners = await getConfigValue("sdui_banners");
    if (banners) config.banners = banners;

    const features = await getConfigValue("sdui_features");
    if (features) config.features = features;

    const version = await getConfigValue("sdui_version");
    if (version) config.version = version;

    res.json({ success: true, data: config });
  } catch (error: any) {
    console.error("[SDUI] Get config error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get config" },
    });
  }
});

// ==================== 获取会员等级配置 ====================

router.get("/membership-tiers", async (req: Request, res: Response) => {
  try {
    const tiers = await getConfigValue("sdui_membership_tiers");
    res.json({ success: true, data: tiers || defaultMembershipTiers });
  } catch (error: any) {
    console.error("[SDUI] Get membership tiers error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get membership tiers" },
    });
  }
});

// ==================== 更新会员等级配置 ====================

router.put("/membership-tiers", async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const { tiers, adminId, adminName } = req.body;

    if (!Array.isArray(tiers) || tiers.length !== 4) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid membership tiers data" },
      });
    }

    await setConfigValue("sdui_membership_tiers", tiers, {
      ru: "Уровни членства",
      zh: "会员等级配置",
    });

    // 更新版本号
    const currentVersion = (await getConfigValue("sdui_version")) || 0;
    const newVersion = currentVersion + 1;
    await setConfigValue("sdui_version", newVersion, {
      ru: "Версия",
      zh: "版本号",
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        tableName: "system_configs",
        recordId: "0",
        action: "UPDATE",
        diffBefore: {},
        diffAfter: { membershipTiers: tiers },
        operatorId: adminId?.toString() || "1",
        operatorType: "ADMIN",
        operatorName: adminName || "Admin",
        reason: "Updated membership tiers",
      },
    });

    res.json({
      success: true,
      data: {
        tiers,
        version: newVersion,
        message: { ru: "Уровни членства обновлены", zh: "会员等级已更新" },
      },
    });
  } catch (error: any) {
    console.error("[SDUI] Update membership tiers error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to update membership tiers" },
    });
  }
});

// ==================== 获取主题配置 ====================

router.get("/theme", async (req: Request, res: Response) => {
  try {
    const theme = await getConfigValue("sdui_theme");
    res.json({ success: true, data: theme || defaultTheme });
  } catch (error: any) {
    console.error("[SDUI] Get theme error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get theme" },
    });
  }
});

// ==================== 更新主题配置 ====================

router.put("/theme", async (req: Request, res: Response) => {
  try {
    const { theme, adminId, adminName } = req.body;

    await setConfigValue("sdui_theme", theme, {
      ru: "Тема приложения",
      zh: "应用主题配置",
    });

    // 更新版本号
    const currentVersion = (await getConfigValue("sdui_version")) || 0;
    const newVersion = currentVersion + 1;
    await setConfigValue("sdui_version", newVersion, {
      ru: "Версия",
      zh: "版本号",
    });

    res.json({
      success: true,
      data: {
        theme,
        version: newVersion,
        message: { ru: "Тема обновлена", zh: "主题已更新" },
      },
    });
  } catch (error: any) {
    console.error("[SDUI] Update theme error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to update theme" },
    });
  }
});

// ==================== 获取 Banner 配置 ====================

router.get("/banners", async (req: Request, res: Response) => {
  try {
    const banners = await getConfigValue("sdui_banners");
    res.json({ success: true, data: banners || defaultBanners });
  } catch (error: any) {
    console.error("[SDUI] Get banners error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get banners" },
    });
  }
});

// ==================== 更新 Banner 配置 ====================

router.put("/banners", async (req: Request, res: Response) => {
  try {
    const { banners, adminId, adminName } = req.body;

    await setConfigValue("sdui_banners", banners, {
      ru: "Баннеры",
      zh: "Banner 配置",
    });

    // 更新版本号
    const currentVersion = (await getConfigValue("sdui_version")) || 0;
    const newVersion = currentVersion + 1;
    await setConfigValue("sdui_version", newVersion, {
      ru: "Версия",
      zh: "版本号",
    });

    res.json({
      success: true,
      data: {
        banners,
        version: newVersion,
        message: { ru: "Баннеры обновлены", zh: "Banner 已更新" },
      },
    });
  } catch (error: any) {
    console.error("[SDUI] Update banners error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to update banners" },
    });
  }
});

// ==================== 获取配置版本 ====================

router.get("/version", async (req: Request, res: Response) => {
  try {
    const version = await getConfigValue("sdui_version");
    res.json({ success: true, data: { version: version || 1 } });
  } catch (error: any) {
    console.error("[SDUI] Get version error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to get version" },
    });
  }
});

export default router;
