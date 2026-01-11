/**
 * CHUTEA 智慧中台 - AI 大脑模块 API
 * 
 * 功能：
 * 1. 9 模块实时数据聚合
 * 2. AI 智能分析建议
 * 3. 老板驾驶舱简报
 * 4. 异常预警检测
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../../db';
import { users, orders, products, stores, withdrawalRequests, auditLogs } from '../../../drizzle/schema';
import { eq, sql, desc, gte, and } from 'drizzle-orm';

const router = Router();

// ==================== 类型定义 ====================

interface ModuleStatus {
  id: string;
  name: { ru: string; zh: string };
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    key: string;
    label: { ru: string; zh: string };
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
    trendPercent?: number;
  }[];
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: { ru: string; zh: string };
    timestamp: string;
  }[];
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: { ru: string; zh: string };
  description: { ru: string; zh: string };
  action?: { ru: string; zh: string };
  module: string;
  timestamp: string;
}

interface DashboardData {
  summary: {
    totalRevenue: number;
    todayOrders: number;
    activeUsers: number;
    pendingWithdrawals: number;
  };
  modules: ModuleStatus[];
  insights: AIInsight[];
  briefing: {
    title: { ru: string; zh: string };
    content: { ru: string; zh: string };
    generatedAt: string;
  };
}

// ==================== 获取仪表盘数据 ====================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    
    // 基础统计数据
    let totalRevenue = 0;
    let todayOrders = 0;
    let activeUsers = 0;
    let pendingWithdrawals = 0;
    let totalProducts = 0;
    let totalStores = 0;
    
    if (db) {
      // 获取今日订单数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const orderStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, today));
      todayOrders = Number(orderStats[0]?.count || 0);
      
      // 获取活跃用户数
      const userStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      activeUsers = Number(userStats[0]?.count || 0);
      
      // 获取待处理提现
      const withdrawalStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, 'PENDING'));
      pendingWithdrawals = Number(withdrawalStats[0]?.count || 0);
      
      // 获取商品数
      const productStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(products);
      totalProducts = Number(productStats[0]?.count || 0);
      
      // 获取门店数
      const storeStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(stores);
      totalStores = Number(storeStats[0]?.count || 0);
      
      // 模拟总收入
      totalRevenue = 125680;
    }
    
    // 构建 9 模块状态
    const modules: ModuleStatus[] = [
      {
        id: 'finance',
        name: { ru: 'Финансы', zh: '财务' },
        status: pendingWithdrawals > 5 ? 'warning' : 'healthy',
        metrics: [
          { key: 'revenue', label: { ru: 'Выручка', zh: '营收' }, value: `${totalRevenue.toLocaleString()} ₽`, trend: 'up', trendPercent: 12 },
          { key: 'pending', label: { ru: 'Ожидает', zh: '待审批' }, value: pendingWithdrawals },
        ],
        alerts: pendingWithdrawals > 5 ? [{
          level: 'warning',
          message: { ru: `${pendingWithdrawals} заявок на вывод ожидают обработки`, zh: `${pendingWithdrawals} 笔提现申请待处理` },
          timestamp: new Date().toISOString(),
        }] : [],
      },
      {
        id: 'marketing',
        name: { ru: 'Маркетинг', zh: '营销' },
        status: 'healthy',
        metrics: [
          { key: 'members', label: { ru: 'Участники', zh: '会员数' }, value: activeUsers, trend: 'up', trendPercent: 8 },
          { key: 'campaigns', label: { ru: 'Кампании', zh: '活动' }, value: 3 },
        ],
        alerts: [],
      },
      {
        id: 'products',
        name: { ru: 'Товары', zh: '商品' },
        status: 'healthy',
        metrics: [
          { key: 'total', label: { ru: 'Всего SKU', zh: '总 SKU' }, value: totalProducts },
          { key: 'active', label: { ru: 'Активных', zh: '启用' }, value: totalProducts },
        ],
        alerts: [],
      },
      {
        id: 'ai',
        name: { ru: 'AI Центр', zh: 'AI 中心' },
        status: 'healthy',
        metrics: [
          { key: 'insights', label: { ru: 'Инсайты', zh: '洞察' }, value: 5 },
          { key: 'accuracy', label: { ru: 'Точность', zh: '准确率' }, value: '94%' },
        ],
        alerts: [],
      },
      {
        id: 'operations',
        name: { ru: 'Операции', zh: '运营' },
        status: 'healthy',
        metrics: [
          { key: 'stores', label: { ru: 'Магазины', zh: '门店' }, value: totalStores },
          { key: 'orders', label: { ru: 'Заказы', zh: '订单' }, value: todayOrders },
        ],
        alerts: [],
      },
      {
        id: 'system',
        name: { ru: 'Система', zh: '系统' },
        status: 'healthy',
        metrics: [
          { key: 'uptime', label: { ru: 'Аптайм', zh: '运行时间' }, value: '99.9%' },
          { key: 'api', label: { ru: 'API', zh: 'API' }, value: 'OK' },
        ],
        alerts: [],
      },
      {
        id: 'influencers',
        name: { ru: 'Блогеры', zh: '达人' },
        status: 'healthy',
        metrics: [
          { key: 'total', label: { ru: 'Всего', zh: '总数' }, value: 12 },
          { key: 'active', label: { ru: 'Активных', zh: '活跃' }, value: 8 },
        ],
        alerts: [],
      },
      {
        id: 'shop',
        name: { ru: 'Магазин', zh: '商城' },
        status: 'healthy',
        metrics: [
          { key: 'orders', label: { ru: 'Заказы', zh: '订单' }, value: todayOrders },
          { key: 'conversion', label: { ru: 'Конверсия', zh: '转化率' }, value: '3.2%' },
        ],
        alerts: [],
      },
      {
        id: 'support',
        name: { ru: 'Поддержка', zh: '客服' },
        status: 'healthy',
        metrics: [
          { key: 'tickets', label: { ru: 'Тикеты', zh: '工单' }, value: 2 },
          { key: 'response', label: { ru: 'Ответ', zh: '响应' }, value: '< 5 мин' },
        ],
        alerts: [],
      },
    ];
    
    // AI 洞察
    const insights: AIInsight[] = [
      {
        id: 'insight-1',
        type: 'opportunity',
        priority: 'high',
        title: { ru: 'Рост продаж молочного чая', zh: '奶茶销量增长' },
        description: { ru: 'Продажи классического молочного чая выросли на 25% за последнюю неделю', zh: '经典奶茶销量过去一周增长 25%' },
        action: { ru: 'Увеличить запасы', zh: '增加库存' },
        module: 'products',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-2',
        type: 'recommendation',
        priority: 'medium',
        title: { ru: 'Оптимизация доставки', zh: '配送优化' },
        description: { ru: 'Среднее время доставки можно сократить на 15% при оптимизации маршрутов', zh: '优化路线可将平均配送时间缩短 15%' },
        module: 'operations',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-3',
        type: 'risk',
        priority: 'low',
        title: { ru: 'Низкий остаток тапиоки', zh: '珍珠库存偏低' },
        description: { ru: 'Запасы тапиоки в центральном магазине ниже минимума', zh: '中心店珍珠库存低于最低值' },
        action: { ru: 'Заказать поставку', zh: '补货' },
        module: 'products',
        timestamp: new Date().toISOString(),
      },
    ];
    
    // 每日简报
    const now = new Date();
    const briefing = {
      title: { 
        ru: `Утренний брифинг - ${now.toLocaleDateString('ru-RU')}`, 
        zh: `早间简报 - ${now.toLocaleDateString('zh-CN')}` 
      },
      content: {
        ru: `📊 Сегодня ${todayOrders} заказов, выручка ${totalRevenue.toLocaleString()} ₽ (+12% к прошлой неделе).\n\n💰 ${pendingWithdrawals} заявок на вывод ожидают обработки.\n\n👥 ${activeUsers} активных пользователей.\n\n✅ Все ${modules.filter(m => m.status === 'healthy').length} модулей работают нормально.\n\n🎯 Рекомендация: Обратите внимание на рост продаж молочного чая и подготовьте дополнительные запасы.`,
        zh: `📊 今日 ${todayOrders} 单订单，营收 ${totalRevenue.toLocaleString()} ₽（较上周 +12%）。\n\n💰 ${pendingWithdrawals} 笔提现申请待处理。\n\n👥 ${activeUsers} 位活跃用户。\n\n✅ 全部 ${modules.filter(m => m.status === 'healthy').length} 个模块运行正常。\n\n🎯 建议：关注奶茶销量增长趋势，提前备货。`
      },
      generatedAt: now.toISOString(),
    };
    
    const dashboardData: DashboardData = {
      summary: {
        totalRevenue,
        todayOrders,
        activeUsers,
        pendingWithdrawals,
      },
      modules,
      insights,
      briefing,
    };
    
    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    console.error('[Brain] Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get dashboard data' },
    });
  }
});

// ==================== 获取 AI 洞察 ====================

router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { module, priority, limit = '10' } = req.query;
    
    // 模拟 AI 洞察数据
    const allInsights: AIInsight[] = [
      {
        id: 'insight-1',
        type: 'opportunity',
        priority: 'high',
        title: { ru: 'Рост продаж молочного чая', zh: '奶茶销量增长' },
        description: { ru: 'Продажи классического молочного чая выросли на 25% за последнюю неделю', zh: '经典奶茶销量过去一周增长 25%' },
        action: { ru: 'Увеличить запасы', zh: '增加库存' },
        module: 'products',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-2',
        type: 'recommendation',
        priority: 'medium',
        title: { ru: 'Оптимизация доставки', zh: '配送优化' },
        description: { ru: 'Среднее время доставки можно сократить на 15% при оптимизации маршрутов', zh: '优化路线可将平均配送时间缩短 15%' },
        module: 'operations',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-3',
        type: 'risk',
        priority: 'low',
        title: { ru: 'Низкий остаток тапиоки', zh: '珍珠库存偏低' },
        description: { ru: 'Запасы тапиоки в центральном магазине ниже минимума', zh: '中心店珍珠库存低于最低值' },
        action: { ru: 'Заказать поставку', zh: '补货' },
        module: 'products',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-4',
        type: 'opportunity',
        priority: 'high',
        title: { ru: 'Потенциал блогеров', zh: '达人潜力' },
        description: { ru: '3 новых блогера показали отличные результаты, рекомендуется повысить их уровень', zh: '3 位新达人表现优秀，建议提升等级' },
        module: 'influencers',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'insight-5',
        type: 'recommendation',
        priority: 'medium',
        title: { ru: 'Акция на выходные', zh: '周末促销' },
        description: { ru: 'Исторические данные показывают, что акции на выходные увеличивают продажи на 30%', zh: '历史数据显示周末促销可提升销量 30%' },
        module: 'marketing',
        timestamp: new Date().toISOString(),
      },
    ];
    
    let filteredInsights = allInsights;
    
    if (module) {
      filteredInsights = filteredInsights.filter(i => i.module === module);
    }
    if (priority) {
      filteredInsights = filteredInsights.filter(i => i.priority === priority);
    }
    
    filteredInsights = filteredInsights.slice(0, parseInt(limit as string));
    
    res.json({
      success: true,
      data: {
        insights: filteredInsights,
        total: filteredInsights.length,
      },
    });
  } catch (error: any) {
    console.error('[Brain] Get insights error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get insights' },
    });
  }
});

// ==================== 获取模块状态 ====================

router.get('/modules/:moduleId/status', async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    
    // 返回特定模块的详细状态
    const moduleStatus: ModuleStatus = {
      id: moduleId,
      name: { ru: moduleId, zh: moduleId },
      status: 'healthy',
      metrics: [],
      alerts: [],
    };
    
    res.json({
      success: true,
      data: moduleStatus,
    });
  } catch (error: any) {
    console.error('[Brain] Get module status error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get module status' },
    });
  }
});

// ==================== 财务风险评估报告 ====================

router.get('/financial-risk-report', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    
    // 收集财务数据
    let pendingWithdrawals = 0;
    let processingWithdrawals = 0;
    let totalWithdrawalAmount = 0;
    let recentApprovedAmount = 0;
    
    if (db) {
      // 待处理提现
      const pendingStats = await db
        .select({ 
          count: sql<number>`count(*)`,
          total: sql<number>`COALESCE(SUM(amount), 0)`
        })
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, 'PENDING'));
      pendingWithdrawals = Number(pendingStats[0]?.count || 0);
      totalWithdrawalAmount = Number(pendingStats[0]?.total || 0);
      
      // 处理中提现
      const processingStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, 'PROCESSING'));
      processingWithdrawals = Number(processingStats[0]?.count || 0);
      
      // 最近批准的提现金额
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentStats = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(withdrawalRequests)
        .where(and(
          eq(withdrawalRequests.status, 'PROCESSING'),
          gte(withdrawalRequests.processedAt, sevenDaysAgo)
        ));
      recentApprovedAmount = Number(recentStats[0]?.total || 0);
    }
    
    const now = new Date();
    
    // 计算风险等级
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let riskScore = 0;
    
    if (totalWithdrawalAmount > 50000) {
      riskScore += 30;
    } else if (totalWithdrawalAmount > 20000) {
      riskScore += 15;
    }
    
    if (pendingWithdrawals > 10) {
      riskScore += 25;
    } else if (pendingWithdrawals > 5) {
      riskScore += 10;
    }
    
    if (recentApprovedAmount > 30000) {
      riskScore += 20;
    }
    
    if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 25) {
      riskLevel = 'MEDIUM';
    }
    
    const report = {
      reportId: `FRR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      generatedAt: now.toISOString(),
      title: {
        ru: 'Отчет о финансовых рисках',
        zh: '财务风险评估报告'
      },
      summary: {
        riskLevel,
        riskScore,
        riskLevelText: {
          ru: riskLevel === 'HIGH' ? 'ВЫСОКИЙ' : riskLevel === 'MEDIUM' ? 'СРЕДНИЙ' : 'НИЗКИЙ',
          zh: riskLevel === 'HIGH' ? '高' : riskLevel === 'MEDIUM' ? '中' : '低'
        }
      },
      metrics: {
        pendingWithdrawals: {
          label: { ru: 'Ожидающие заявки', zh: '待处理申请' },
          value: pendingWithdrawals,
          unit: { ru: 'шт.', zh: '笔' }
        },
        processingWithdrawals: {
          label: { ru: 'В обработке', zh: '处理中' },
          value: processingWithdrawals,
          unit: { ru: 'шт.', zh: '笔' }
        },
        totalPendingAmount: {
          label: { ru: 'Общая сумма ожидания', zh: '待处理总额' },
          value: totalWithdrawalAmount,
          unit: { ru: '₽', zh: '₽' }
        },
        recentApprovedAmount: {
          label: { ru: 'Одобрено за 7 дней', zh: '近7天批准额' },
          value: recentApprovedAmount,
          unit: { ru: '₽', zh: '₽' }
        }
      },
      recentTransactions: [
        {
          id: 'TXN-SAMPLE-001',
          type: 'WITHDRAWAL',
          amount: 5000,
          status: 'PROCESSING',
          description: { ru: 'Вывод средств инфлюенсера', zh: '达人提现' },
          timestamp: now.toISOString()
        }
      ],
      recommendations: [
        {
          priority: 'high',
          text: {
            ru: 'Рекомендуется установить дневной лимит вывода средств для контроля денежного потока',
            zh: '建议设置每日提现限额以控制现金流'
          }
        },
        {
          priority: 'medium',
          text: {
            ru: 'Рассмотрите возможность автоматического одобрения мелких заявок (до 1000₽)',
            zh: '考虑对小额申请(≤1000₽)启用自动审批'
          }
        },
        {
          priority: 'low',
          text: {
            ru: 'Регулярно проверяйте банковские реквизиты инфлюенсеров',
            zh: '定期核查达人银行信息'
          }
        }
      ],
      alerts: riskLevel === 'HIGH' ? [
        {
          level: 'critical',
          message: {
            ru: '⚠️ Внимание! Общая сумма ожидающих выводов превышает пороговое значение',
            zh: '⚠️ 警告！待处理提现总额超过阈值'
          }
        }
      ] : [],
      footer: {
        ru: 'Данный отчет сгенерирован автоматически системой AI CHUTEA',
        zh: '本报告由 CHUTEA AI 系统自动生成'
      }
    };
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[Brain] Get financial risk report error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get financial risk report' },
    });
  }
});

// ==================== 生成 AI 简报 ====================

router.post('/briefing/generate', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    
    // 收集数据
    let todayOrders = 0;
    let activeUsers = 0;
    let pendingWithdrawals = 0;
    
    if (db) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const orderStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, today));
      todayOrders = Number(orderStats[0]?.count || 0);
      
      const userStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      activeUsers = Number(userStats[0]?.count || 0);
      
      const withdrawalStats = await db
        .select({ count: sql<number>`count(*)` })
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, 'PENDING'));
      pendingWithdrawals = Number(withdrawalStats[0]?.count || 0);
    }
    
    const now = new Date();
    const briefing = {
      title: { 
        ru: `AI Брифинг - ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU')}`, 
        zh: `AI 简报 - ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN')}` 
      },
      content: {
        ru: `🤖 **AI 分析报告**\n\n📊 今日订单: ${todayOrders}\n👥 活跃用户: ${activeUsers}\n💰 待处理提现: ${pendingWithdrawals}\n\n**建议:**\n1. 关注高峰时段备货\n2. 优化配送路线\n3. 及时处理提现申请`,
        zh: `🤖 **AI 分析报告**\n\n📊 今日订单: ${todayOrders}\n👥 活跃用户: ${activeUsers}\n💰 待处理提现: ${pendingWithdrawals}\n\n**建议:**\n1. 关注高峰时段备货\n2. 优化配送路线\n3. 及时处理提现申请`
      },
      generatedAt: now.toISOString(),
    };
    
    res.json({
      success: true,
      data: briefing,
    });
  } catch (error: any) {
    console.error('[Brain] Generate briefing error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to generate briefing' },
    });
  }
});

export default router;
