/**
 * DeepSeek BI 数据分析服务
 *
 * 利用 DeepSeek API 构建系统的"大脑"，实现：
 * 1. 销售异常检测
 * 2. 达人 ROI 分析
 * 3. 库存预警与补货建议
 * 4. 自然语言查询 (Text-to-SQL)
 * 5. 跨组织财务审计
 */

import { PrismaClient } from "@prisma/client";

// DeepSeek API 配置
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL ||
  "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// 数据库表结构描述（用于 Text-to-SQL）
const DATABASE_SCHEMA_DESCRIPTION = `
CHUTEA 数据库包含以下核心表：

## 用户与认证
- users: 用户表 (id, phone, email, name, role, orgId, storeId, status)
- user_preferences: 用户偏好 (userId, languageCode, timezone, currency)

## 组织与门店
- organizations: 组织表 (id, name, code, type, timezone, currency)
- stores: 门店表 (id, orgId, name, code, address, phone, isActive)
- iiko_configs: IIKO 配置 (orgId, apiKey, organizationId, terminalGroupId)

## 产品与分类
- categories: 分类表 (id, name, sortOrder, isActive)
- products: 产品表 (id, categoryId, name, description, basePrice, isActive)
- product_option_groups: 选项组 (id, productId, name, type, required)
- product_option_items: 选项项 (id, groupId, name, priceAdjustment, isDefault)

## 订单与交易
- orders: 订单表 (id, userId, storeId, orderNumber, status, totalAmount, paymentMethod)
- order_items: 订单项 (id, orderId, productId, quantity, unitPrice, totalPrice)
- payments: 支付记录 (id, orderId, amount, method, status, transactionId)

## 营销与优惠
- marketing_rules: 营销规则 (id, name, type, config, status, startTime, endTime)
- coupons: 优惠券 (id, code, type, value, minOrderAmount, usageLimit)
- user_coupons: 用户优惠券 (userId, couponId, status, usedAt)
- banners: 广告横幅 (id, title, imageUrl, linkUrl, position, startTime, endTime)

## 会员与积分
- member_levels: 会员等级 (id, name, minPoints, discount, benefits)
- points_accounts: 积分账户 (userId, balance, totalEarned, totalSpent)
- points_transactions: 积分交易 (id, accountId, amount, type, orderId)

## 达人与推广
- influencer_profiles: 达人资料 (id, userId, name, socialPlatform, socialHandle, tier, commissionRate)
- influencer_links: 推广链接 (id, influencerId, storeId, trackingCode, clickCount, orderCount)
- influencer_commissions: 佣金记录 (id, influencerId, orderId, amount, status)

## 审计与日志
- audit_logs: 审计日志 (id, action, entityType, entityId, operatorId, previousHash, currentHash)
`;

// 数据脱敏函数
function anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    "phone",
    "email",
    "password",
    "apiKey",
    "secretKey",
    "token",
    "address",
    "name",
  ];
  const anonymized = { ...data };

  for (const key of Object.keys(anonymized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      if (typeof anonymized[key] === "string") {
        anonymized[key] = "[REDACTED]";
      }
    }
    if (typeof anonymized[key] === "object" && anonymized[key] !== null) {
      anonymized[key] = anonymizeData(
        anonymized[key] as Record<string, unknown>
      );
    }
  }

  return anonymized;
}

// 调用 DeepSeek API
async function callDeepSeekAPI(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const {
    model = "deepseek-chat",
    temperature = 0.3,
    maxTokens = 4000,
  } = options;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from DeepSeek API");
  }

  return content.trim();
}

// ==================== 销售异常检测 ====================

export interface SalesAnomalyResult {
  success: boolean;
  anomalies: Array<{
    type: "SPIKE" | "DROP" | "UNUSUAL_PATTERN" | "OUTLIER";
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
    affectedStore?: string;
    affectedProduct?: string;
    suggestedAction: string;
    dataPoints: Record<string, unknown>;
  }>;
  summary: string;
  error?: string;
}

export async function detectSalesAnomalies(
  prisma: PrismaClient,
  orgId: string,
  dateRange: { start: Date; end: Date }
): Promise<SalesAnomalyResult> {
  try {
    // 获取销售数据（脱敏处理）
    const orders = await prisma.order.findMany({
      where: {
        store: { orgId },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        id: true,
        storeId: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        store: { select: { name: true } },
      },
    });

    // 按门店和日期聚合
    const salesByStoreAndDate: Record<
      string,
      Record<string, { count: number; total: number }>
    > = {};

    for (const order of orders) {
      const storeKey = order.storeId;
      const dateKey = order.createdAt.toISOString().split("T")[0];

      if (!salesByStoreAndDate[storeKey]) {
        salesByStoreAndDate[storeKey] = {};
      }
      if (!salesByStoreAndDate[storeKey][dateKey]) {
        salesByStoreAndDate[storeKey][dateKey] = { count: 0, total: 0 };
      }

      salesByStoreAndDate[storeKey][dateKey].count++;
      salesByStoreAndDate[storeKey][dateKey].total += Number(order.totalAmount);
    }

    // 构建分析提示
    const systemPrompt = `你是一个专业的商业数据分析师，专门分析茶饮店的销售数据。
你需要识别销售异常，包括：
1. 销售额突然飙升或骤降
2. 异常的销售模式
3. 与历史数据相比的异常值
4. 门店间的异常差异

请以 JSON 格式返回分析结果，包含 anomalies 数组和 summary 字符串。`;

    const userPrompt = `请分析以下销售数据，识别任何异常情况：

${JSON.stringify(anonymizeData(salesByStoreAndDate as Record<string, unknown>), null, 2)}

时间范围：${dateRange.start.toISOString()} 至 ${dateRange.end.toISOString()}

请返回 JSON 格式的分析结果：
{
  "anomalies": [
    {
      "type": "SPIKE|DROP|UNUSUAL_PATTERN|OUTLIER",
      "severity": "LOW|MEDIUM|HIGH",
      "description": "异常描述",
      "affectedStore": "门店ID（如适用）",
      "suggestedAction": "建议采取的行动"
    }
  ],
  "summary": "整体分析总结"
}`;

    const response = await callDeepSeekAPI(systemPrompt, userPrompt);

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: true,
        anomalies: [],
        summary: response,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      anomalies: parsed.anomalies || [],
      summary: parsed.summary || "分析完成",
    };
  } catch (error) {
    console.error("[DeepSeek BI] Sales anomaly detection error:", error);
    return {
      success: false,
      anomalies: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== 达人 ROI 分析 ====================

export interface InfluencerROIResult {
  success: boolean;
  analysis: Array<{
    influencerId: string;
    name: string;
    tier: string;
    metrics: {
      totalClicks: number;
      totalOrders: number;
      conversionRate: number;
      totalRevenue: number;
      totalCommission: number;
      roi: number;
      customerAcquisitionCost: number;
    };
    performance: "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR";
    recommendation: string;
  }>;
  summary: string;
  error?: string;
}

export async function analyzeInfluencerROI(
  prisma: PrismaClient,
  orgId: string,
  dateRange: { start: Date; end: Date }
): Promise<InfluencerROIResult> {
  try {
    // 获取达人数据
    const influencers = await prisma.influencerProfile.findMany({
      where: {
        user: { orgId },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        commissionRate: true,
        links: {
          select: {
            clickCount: true,
            orderCount: true,
            totalRevenue: true,
          },
        },
        commissions: {
          where: {
            createdAt: { gte: dateRange.start, lte: dateRange.end },
          },
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    // 计算每个达人的指标
    const influencerMetrics = influencers.map(inf => {
      const totalClicks = inf.links.reduce((sum, l) => sum + l.clickCount, 0);
      const totalOrders = inf.links.reduce((sum, l) => sum + l.orderCount, 0);
      const totalRevenue = inf.links.reduce(
        (sum, l) => sum + Number(l.totalRevenue),
        0
      );
      const totalCommission = inf.commissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );

      return {
        influencerId: inf.id,
        name: inf.name,
        tier: inf.tier,
        totalClicks,
        totalOrders,
        conversionRate: totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0,
        totalRevenue,
        totalCommission,
        roi:
          totalCommission > 0
            ? ((totalRevenue - totalCommission) / totalCommission) * 100
            : 0,
        customerAcquisitionCost:
          totalOrders > 0 ? totalCommission / totalOrders : 0,
      };
    });

    // 构建分析提示
    const systemPrompt = `你是一个专业的营销分析师，专门评估达人/网红的营销效果。
请根据以下指标评估每个达人的表现：
- 转化率 (点击到订单)
- ROI (投资回报率)
- 获客成本
- 总收入贡献

请给出具体的改进建议。`;

    const userPrompt = `请分析以下达人的营销效果数据：

${JSON.stringify(anonymizeData({ influencers: influencerMetrics }), null, 2)}

时间范围：${dateRange.start.toISOString()} 至 ${dateRange.end.toISOString()}

请返回 JSON 格式的分析结果：
{
  "analysis": [
    {
      "influencerId": "达人ID",
      "performance": "EXCELLENT|GOOD|AVERAGE|POOR",
      "recommendation": "具体建议"
    }
  ],
  "summary": "整体分析总结"
}`;

    const response = await callDeepSeekAPI(systemPrompt, userPrompt);

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: true,
        analysis: influencerMetrics.map(m => ({
          ...m,
          metrics: {
            totalClicks: m.totalClicks,
            totalOrders: m.totalOrders,
            conversionRate: m.conversionRate,
            totalRevenue: m.totalRevenue,
            totalCommission: m.totalCommission,
            roi: m.roi,
            customerAcquisitionCost: m.customerAcquisitionCost,
          },
          performance: "AVERAGE" as const,
          recommendation: response,
        })),
        summary: response,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 合并计算的指标和 AI 分析
    const analysis = influencerMetrics.map(m => {
      const aiAnalysis = parsed.analysis?.find(
        (a: { influencerId: string }) => a.influencerId === m.influencerId
      );
      return {
        influencerId: m.influencerId,
        name: m.name,
        tier: m.tier,
        metrics: {
          totalClicks: m.totalClicks,
          totalOrders: m.totalOrders,
          conversionRate: m.conversionRate,
          totalRevenue: m.totalRevenue,
          totalCommission: m.totalCommission,
          roi: m.roi,
          customerAcquisitionCost: m.customerAcquisitionCost,
        },
        performance: aiAnalysis?.performance || ("AVERAGE" as const),
        recommendation: aiAnalysis?.recommendation || "暂无建议",
      };
    });

    return {
      success: true,
      analysis,
      summary: parsed.summary || "分析完成",
    };
  } catch (error) {
    console.error("[DeepSeek BI] Influencer ROI analysis error:", error);
    return {
      success: false,
      analysis: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== 库存预警与补货建议 ====================

export interface InventoryPredictionResult {
  success: boolean;
  predictions: Array<{
    productId: string;
    productName: string;
    currentStock?: number;
    predictedDemand: number;
    daysUntilStockout?: number;
    suggestedReorderQuantity: number;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    reasoning: string;
  }>;
  summary: string;
  error?: string;
}

export async function predictInventoryNeeds(
  prisma: PrismaClient,
  orgId: string,
  forecastDays: number = 7
): Promise<InventoryPredictionResult> {
  try {
    // 获取历史销售数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          store: { orgId },
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["COMPLETED", "DELIVERED"] },
        },
      },
      select: {
        productId: true,
        quantity: true,
        order: { select: { createdAt: true } },
        product: { select: { name: true } },
      },
    });

    // 按产品聚合销售数据
    const productSales: Record<
      string,
      { name: string; dailySales: Record<string, number> }
    > = {};

    for (const item of orderItems) {
      const productId = item.productId;
      const dateKey = item.order.createdAt.toISOString().split("T")[0];
      const productName =
        typeof item.product.name === "object"
          ? (item.product.name as { zh?: string }).zh || "Unknown"
          : String(item.product.name);

      if (!productSales[productId]) {
        productSales[productId] = { name: productName, dailySales: {} };
      }
      if (!productSales[productId].dailySales[dateKey]) {
        productSales[productId].dailySales[dateKey] = 0;
      }
      productSales[productId].dailySales[dateKey] += item.quantity;
    }

    // 构建分析提示
    const systemPrompt = `你是一个专业的库存管理分析师，专门为茶饮店预测库存需求。
请根据历史销售数据：
1. 预测未来 ${forecastDays} 天的需求
2. 识别可能缺货的产品
3. 给出补货建议
4. 考虑季节性和趋势因素`;

    const userPrompt = `请分析以下产品的历史销售数据，预测未来 ${forecastDays} 天的需求：

${JSON.stringify(productSales, null, 2)}

请返回 JSON 格式的预测结果：
{
  "predictions": [
    {
      "productId": "产品ID",
      "productName": "产品名称",
      "predictedDemand": 预测需求量,
      "suggestedReorderQuantity": 建议补货量,
      "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
      "reasoning": "预测依据"
    }
  ],
  "summary": "整体库存状况总结"
}`;

    const response = await callDeepSeekAPI(systemPrompt, userPrompt);

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: true,
        predictions: [],
        summary: response,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      predictions: parsed.predictions || [],
      summary: parsed.summary || "预测完成",
    };
  } catch (error) {
    console.error("[DeepSeek BI] Inventory prediction error:", error);
    return {
      success: false,
      predictions: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== 自然语言查询 (Text-to-SQL) ====================

export interface TextToSQLResult {
  success: boolean;
  query?: string;
  explanation?: string;
  results?: unknown[];
  analysis?: string;
  error?: string;
}

export async function executeNaturalLanguageQuery(
  prisma: PrismaClient,
  question: string,
  orgId: string
): Promise<TextToSQLResult> {
  try {
    // 构建 Text-to-SQL 提示
    const systemPrompt = `你是一个专业的数据库分析师，能够将自然语言问题转换为 SQL 查询。

数据库结构：
${DATABASE_SCHEMA_DESCRIPTION}

重要规则：
1. 只生成 SELECT 查询，禁止 INSERT/UPDATE/DELETE
2. 必须添加 orgId 过滤条件以确保数据隔离
3. 使用 Prisma 兼容的 PostgreSQL 语法
4. 限制返回结果数量（最多 100 条）
5. 不要查询敏感字段（password, apiKey, token 等）`;

    const userPrompt = `用户问题：${question}

组织 ID：${orgId}

请返回 JSON 格式：
{
  "query": "SQL 查询语句",
  "explanation": "查询说明",
  "analysisPrompt": "用于分析结果的提示（可选）"
}

注意：查询必须包含 orgId = '${orgId}' 的过滤条件。`;

    const response = await callDeepSeekAPI(systemPrompt, userPrompt, {
      temperature: 0.1, // 低温度以获得更准确的 SQL
    });

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: "无法生成有效的查询",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const query = parsed.query;

    // 安全检查
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes("insert") ||
      lowerQuery.includes("update") ||
      lowerQuery.includes("delete") ||
      lowerQuery.includes("drop") ||
      lowerQuery.includes("truncate") ||
      lowerQuery.includes("alter")
    ) {
      return {
        success: false,
        error: "不允许执行修改数据的查询",
      };
    }

    // 执行查询
    const results = await prisma.$queryRawUnsafe(query);

    // 分析结果
    let analysis = "";
    if (parsed.analysisPrompt && Array.isArray(results) && results.length > 0) {
      const analysisResponse = await callDeepSeekAPI(
        "你是一个数据分析师，请用简洁的中文分析以下查询结果。",
        `问题：${question}\n\n查询结果：${JSON.stringify(anonymizeData({ results }), null, 2)}\n\n请给出分析和洞察。`
      );
      analysis = analysisResponse;
    }

    return {
      success: true,
      query,
      explanation: parsed.explanation,
      results: Array.isArray(results) ? results : [results],
      analysis,
    };
  } catch (error) {
    console.error("[DeepSeek BI] Text-to-SQL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== 跨组织财务审计 ====================

export interface CrossOrgAuditResult {
  success: boolean;
  findings: Array<{
    type:
      | "POINTS_ABUSE"
      | "COUPON_MISUSE"
      | "CROSS_ORG_TRANSFER"
      | "ANOMALY"
      | "COMPLIANCE";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    affectedOrgs: string[];
    evidence: Record<string, unknown>;
    recommendation: string;
  }>;
  summary: string;
  complianceScore: number;
  error?: string;
}

export async function auditCrossOrgFinancials(
  prisma: PrismaClient,
  orgIds: string[]
): Promise<CrossOrgAuditResult> {
  try {
    // 获取各组织的积分和优惠券使用数据
    const orgsData = await Promise.all(
      orgIds.map(async orgId => {
        const [pointsTransactions, couponUsage, orders] = await Promise.all([
          prisma.pointsTransaction.findMany({
            where: { account: { user: { orgId } } },
            select: {
              id: true,
              amount: true,
              type: true,
              createdAt: true,
              account: { select: { userId: true } },
            },
            take: 1000,
          }),
          prisma.userCoupon.findMany({
            where: { user: { orgId } },
            select: {
              id: true,
              status: true,
              usedAt: true,
              coupon: { select: { code: true, type: true, value: true } },
            },
            take: 1000,
          }),
          prisma.order.findMany({
            where: { store: { orgId } },
            select: {
              id: true,
              totalAmount: true,
              discountAmount: true,
              pointsUsed: true,
              createdAt: true,
            },
            take: 1000,
          }),
        ]);

        return {
          orgId,
          pointsTransactions: pointsTransactions.length,
          totalPointsEarned: pointsTransactions
            .filter(t => t.type === "EARN")
            .reduce((sum, t) => sum + t.amount, 0),
          totalPointsSpent: pointsTransactions
            .filter(t => t.type === "SPEND")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0),
          couponUsage: couponUsage.filter(c => c.status === "USED").length,
          totalOrders: orders.length,
          totalRevenue: orders.reduce(
            (sum, o) => sum + Number(o.totalAmount),
            0
          ),
          totalDiscounts: orders.reduce(
            (sum, o) => sum + Number(o.discountAmount || 0),
            0
          ),
        };
      })
    );

    // 构建审计分析提示
    const systemPrompt = `你是一个专业的财务审计师，专门检查多组织系统中的财务合规性。
请检查以下问题：
1. 积分是否在组织间被滥用
2. 优惠券是否被跨组织冒用
3. 是否存在异常的财务模式
4. 各组织的财务数据是否独立隔离

请给出合规评分（0-100）和具体发现。`;

    const userPrompt = `请审计以下多组织财务数据：

${JSON.stringify(anonymizeData({ organizations: orgsData }), null, 2)}

请返回 JSON 格式的审计结果：
{
  "findings": [
    {
      "type": "POINTS_ABUSE|COUPON_MISUSE|CROSS_ORG_TRANSFER|ANOMALY|COMPLIANCE",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "问题描述",
      "affectedOrgs": ["组织ID"],
      "recommendation": "改进建议"
    }
  ],
  "summary": "审计总结",
  "complianceScore": 0-100
}`;

    const response = await callDeepSeekAPI(systemPrompt, userPrompt);

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: true,
        findings: [],
        summary: response,
        complianceScore: 100,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      findings: parsed.findings || [],
      summary: parsed.summary || "审计完成",
      complianceScore: parsed.complianceScore || 100,
    };
  } catch (error) {
    console.error("[DeepSeek BI] Cross-org audit error:", error);
    return {
      success: false,
      findings: [],
      summary: "",
      complianceScore: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== 连接测试 ====================

export async function testDeepSeekConnection(): Promise<{
  success: boolean;
  model?: string;
  latency?: number;
  error?: string;
}> {
  if (!DEEPSEEK_API_KEY) {
    return { success: false, error: "DEEPSEEK_API_KEY is not configured" };
  }

  const startTime = Date.now();

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
      }),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        model: data.model || "deepseek-chat",
        latency,
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
        latency,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
      latency: Date.now() - startTime,
    };
  }
}

// ==================== 导出服务类 ====================

export class DeepSeekBIService {
  constructor(private prisma: PrismaClient) {}

  async testConnection() {
    return testDeepSeekConnection();
  }

  async detectSalesAnomalies(
    orgId: string,
    dateRange: { start: Date; end: Date }
  ) {
    return detectSalesAnomalies(this.prisma, orgId, dateRange);
  }

  async analyzeInfluencerROI(
    orgId: string,
    dateRange: { start: Date; end: Date }
  ) {
    return analyzeInfluencerROI(this.prisma, orgId, dateRange);
  }

  async predictInventoryNeeds(orgId: string, forecastDays?: number) {
    return predictInventoryNeeds(this.prisma, orgId, forecastDays);
  }

  async executeNaturalLanguageQuery(question: string, orgId: string) {
    return executeNaturalLanguageQuery(this.prisma, question, orgId);
  }

  async auditCrossOrgFinancials(orgIds: string[]) {
    return auditCrossOrgFinancials(this.prisma, orgIds);
  }
}
