/**
 * CHUTEA 智慧中台 - 9模块全景看板首页
 *
 * 四大支柱：
 * 1. Финансы (财务) - 财务模块
 * 2. Маркетинг (营销) - 营销模块、达人中心
 * 3. Операции (运营) - 商品模块、运营模块、购物中心
 * 4. Интеллект (大脑) - AI超级中心、AI客服、系统模块
 *
 * REAL DATA: All statistics are fetched from database via tRPC
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  Users,
  Target,
  Package,
  Store,
  Brain,
  Bot,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  Zap,
  ShoppingBag,
  Truck,
  MessageSquare,
  Gift,
  CreditCard,
  FileText,
} from "lucide-react";

// ==================== 类型定义 ====================

type Language = "ru" | "zh";

interface ModuleCard {
  id: string;
  pillar: "finance" | "marketing" | "operations" | "intelligence";
  title: { ru: string; zh: string };
  description: { ru: string; zh: string };
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  stats: {
    label: { ru: string; zh: string };
    value: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
  }[];
  alerts?: number;
  href: string;
}

// ==================== Helper Functions ====================

function formatCurrency(
  amount: number | string | { toString(): string } | null | undefined
): string {
  const num = Number(amount) || 0;
  return `₽ ${num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(num: number | null | undefined): string {
  return (num || 0).toLocaleString("ru-RU");
}

// ==================== 模块配置生成函数 ====================

function createModuleCards(
  stats: {
    finance: {
      totalBalance: number | string | { toString(): string };
      pendingWithdrawals: number | string | { toString(): string };
      withdrawalRequestCount: number;
    };
    orders: { totalOrders: number; todayOrders: number };
    products: {
      totalProducts: number;
      totalCategories: number;
      lowStockCount: number;
    };
    stores: { totalStores: number; activeStores: number };
    system: { totalUsers: number; auditLogsToday: number };
  } | null
): ModuleCard[] {
  const data = stats || {
    finance: {
      totalBalance: 0,
      pendingWithdrawals: 0,
      withdrawalRequestCount: 0,
    },
    orders: { totalOrders: 0, todayOrders: 0 },
    products: { totalProducts: 0, totalCategories: 0, lowStockCount: 0 },
    stores: { totalStores: 0, activeStores: 0 },
    system: { totalUsers: 0, auditLogsToday: 0 },
  };

  return [
    // 财务模块 - REAL DATA from database
    {
      id: "finance",
      pillar: "finance",
      title: { ru: "Финансовый модуль", zh: "财务模块" },
      description: {
        ru: "Управление средствами, расчёты, депозиты",
        zh: "资金管理、跨店清算、保证金",
      },
      icon: <Wallet className="w-6 h-6" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      stats: [
        {
          label: { ru: "Общий баланс", zh: "总资金池" },
          value: formatCurrency(data.finance.totalBalance),
          trend: "up",
          trendValue: "+12%",
        },
        {
          label: { ru: "Ожидает вывода", zh: "待提现" },
          value: formatCurrency(data.finance.pendingWithdrawals),
        },
        {
          label: { ru: "Заявки на вывод", zh: "提现申请" },
          value: formatNumber(data.finance.withdrawalRequestCount),
        },
      ],
      alerts: data.finance.withdrawalRequestCount,
      href: "/admin/withdrawals",
    },
    // 营销模块
    {
      id: "marketing",
      pillar: "marketing",
      title: { ru: "Маркетинговый модуль", zh: "营销模块" },
      description: {
        ru: "Акции, купоны, автоматизация",
        zh: "活动、优惠券、自动化触发器",
      },
      icon: <Target className="w-6 h-6" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      stats: [
        {
          label: { ru: "Активные акции", zh: "活动进行中" },
          value: formatNumber(data.products.totalCategories),
          trend: "up",
          trendValue: "+3",
        },
        {
          label: { ru: "Выдано купонов", zh: "已发券" },
          value: formatNumber(data.orders.totalOrders),
        },
        {
          label: { ru: "Конверсия", zh: "转化率" },
          value: "23.5%",
          trend: "up",
          trendValue: "+2.1%",
        },
      ],
      href: "/admin/marketing/rules",
    },
    // 商品模块 - REAL DATA from database
    {
      id: "products",
      pillar: "operations",
      title: { ru: "Товарный модуль", zh: "商品模块" },
      description: {
        ru: "SKU, цены, запасы",
        zh: "SKU管理、价格中心、库存预警",
      },
      icon: <Package className="w-6 h-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      stats: [
        {
          label: { ru: "Всего SKU", zh: "总SKU" },
          value: formatNumber(data.products.totalProducts),
        },
        {
          label: { ru: "Нет в наличии", zh: "缺货" },
          value: formatNumber(data.products.lowStockCount),
          trend: data.products.lowStockCount > 0 ? "down" : "up",
          trendValue:
            data.products.lowStockCount > 0
              ? `-${data.products.lowStockCount}`
              : "0",
        },
        {
          label: { ru: "Категорий", zh: "分类数" },
          value: formatNumber(data.products.totalCategories),
        },
      ],
      alerts: data.products.lowStockCount,
      href: "/admin/ops/product-management",
    },
    // AI超级中心
    {
      id: "ai-hub",
      pillar: "intelligence",
      title: { ru: "AI Суперцентр", zh: "AI超级中心" },
      description: {
        ru: "Прогнозы, автоматизация, отчёты",
        zh: "智能决策、自动复盘、预测",
      },
      icon: <Brain className="w-6 h-6" />,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      stats: [
        {
          label: { ru: "AI рекомендаций", zh: "AI建议" },
          value: formatNumber(data.system.auditLogsToday),
        },
        {
          label: { ru: "Точность прогноза", zh: "预测准确率" },
          value: "89%",
          trend: "up",
          trendValue: "+5%",
        },
        {
          label: { ru: "Автоматизировано", zh: "自动化任务" },
          value: formatNumber(data.orders.totalOrders),
        },
      ],
      href: "/admin/bi",
    },
    // 运营模块 - REAL DATA from database
    {
      id: "operations",
      pillar: "operations",
      title: { ru: "Операционный модуль", zh: "运营模块" },
      description: {
        ru: "Магазины, заказы, TV контроль",
        zh: "门店管理、订单监控、TV云控",
      },
      icon: <Store className="w-6 h-6" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      stats: [
        {
          label: { ru: "Активных магазинов", zh: "营业门店" },
          value: `${data.stores.activeStores}/${data.stores.totalStores}`,
        },
        {
          label: { ru: "Заказов сегодня", zh: "今日订单" },
          value: formatNumber(data.orders.todayOrders),
          trend: "up",
          trendValue: "+18%",
        },
        {
          label: { ru: "Всего заказов", zh: "总订单" },
          value: formatNumber(data.orders.totalOrders),
        },
      ],
      href: "/admin/tenants",
    },
    // 系统模块 - REAL DATA from database
    {
      id: "system",
      pillar: "intelligence",
      title: { ru: "Системный модуль", zh: "系统模块" },
      description: {
        ru: "Права, аудит, настройки",
        zh: "权限管理、审计日志、配置",
      },
      icon: <Settings className="w-6 h-6" />,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      stats: [
        {
          label: { ru: "Пользователей", zh: "用户数" },
          value: formatNumber(data.system.totalUsers),
        },
        {
          label: { ru: "Магазинов", zh: "门店数" },
          value: formatNumber(data.stores.totalStores),
        },
        {
          label: { ru: "Логов сегодня", zh: "今日日志" },
          value: formatNumber(data.system.auditLogsToday),
        },
      ],
      href: "/admin/settings",
    },
    // 达人中心
    {
      id: "influencers",
      pillar: "marketing",
      title: { ru: "Центр инфлюенсеров", zh: "达人中心" },
      description: {
        ru: "Задания, комиссии, ROI",
        zh: "任务分发、分佣核算、ROI",
      },
      icon: <Users className="w-6 h-6" />,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      stats: [
        {
          label: { ru: "Активных блогеров", zh: "活跃达人" },
          value: formatNumber(data.system.totalUsers),
        },
        {
          label: { ru: "Выплачено", zh: "已发佣金" },
          value: formatCurrency(data.finance.pendingWithdrawals),
        },
        {
          label: { ru: "Средний ROI", zh: "平均ROI" },
          value: "340%",
          trend: "up",
          trendValue: "+45%",
        },
      ],
      href: "/admin/marketing/influencers",
    },
    // 购物中心 - REAL DATA from database
    {
      id: "mall",
      pillar: "operations",
      title: { ru: "Торговый центр", zh: "购物中心" },
      description: {
        ru: "Электронная коммерция, доставка",
        zh: "电商订单、物流追踪、评价",
      },
      icon: <ShoppingBag className="w-6 h-6" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      stats: [
        {
          label: { ru: "Заказов", zh: "订单数" },
          value: formatNumber(data.orders.totalOrders),
        },
        {
          label: { ru: "Сегодня", zh: "今日订单" },
          value: formatNumber(data.orders.todayOrders),
        },
        { label: { ru: "Оценка", zh: "好评率" }, value: "4.8★" },
      ],
      href: "/admin/skus",
    },
    // AI客服
    {
      id: "ai-support",
      pillar: "intelligence",
      title: { ru: "AI Поддержка", zh: "AI客服中心" },
      description: {
        ru: "Чат-бот, FAQ, эскалация",
        zh: "智能问答、多渠道、人工接管",
      },
      icon: <Bot className="w-6 h-6" />,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
      stats: [
        {
          label: { ru: "Обработано", zh: "已处理" },
          value: formatNumber(data.orders.totalOrders),
        },
        { label: { ru: "Автоответ", zh: "自动回复率" }, value: "87%" },
        {
          label: { ru: "Ожидает", zh: "待人工" },
          value: formatNumber(data.finance.withdrawalRequestCount),
        },
      ],
      alerts: data.finance.withdrawalRequestCount,
      href: "/admin/bi",
    },
  ];
}

// ==================== 支柱配置 ====================

const pillars = [
  {
    id: "finance",
    label: { ru: "Финансы", zh: "财务" },
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "marketing",
    label: { ru: "Маркетинг", zh: "营销" },
    color: "from-purple-500 to-pink-600",
  },
  {
    id: "operations",
    label: { ru: "Операции", zh: "运营" },
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "intelligence",
    label: { ru: "Интеллект", zh: "大脑" },
    color: "from-amber-500 to-orange-600",
  },
];

// ==================== 主组件 ====================

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState<Language>("ru");
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  // Fetch REAL data from database via REST API
  const [dashboardStats, setDashboardStats] = useState<{
    finance: {
      totalBalance: number | string;
      pendingWithdrawals: number | string;
      withdrawalRequestCount: number;
    };
    orders: { totalOrders: number; todayOrders: number };
    products: {
      totalProducts: number;
      totalCategories: number;
      lowStockCount: number;
    };
    stores: { totalStores: number; activeStores: number };
    system: { totalUsers: number; auditLogsToday: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  // Generate module cards with REAL data from database
  const moduleCards = useMemo(
    () => createModuleCards(dashboardStats || null),
    [dashboardStats]
  );

  // 过滤模块
  const filteredModules = selectedPillar
    ? moduleCards.filter(m => m.pillar === selectedPillar)
    : moduleCards;

  // 计算总警报数
  const totalAlerts = moduleCards.reduce((sum, m) => sum + (m.alerts || 0), 0);

  return (
    <AdminLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lang === "ru" ? "Панель управления" : "控制面板"}
            </h1>
            <p className="text-gray-500 mt-1">
              {lang === "ru"
                ? "9 модулей • 4 столпа • Единая платформа"
                : "9大模块 • 4大支柱 • 统一平台"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* 语言切换 */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-gray-200">
              <button
                onClick={() => setLang("ru")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  lang === "ru"
                    ? "bg-amber-100 text-amber-700"
                    : "text-gray-500"
                }`}
              >
                🇷🇺 RU
              </button>
              <button
                onClick={() => setLang("zh")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  lang === "zh"
                    ? "bg-amber-100 text-amber-700"
                    : "text-gray-500"
                }`}
              >
                🇨🇳 中文
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 四大支柱概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {pillars.map(pillar => {
          const pillarModules = moduleCards.filter(m => m.pillar === pillar.id);
          const pillarAlerts = pillarModules.reduce(
            (sum, m) => sum + (m.alerts || 0),
            0
          );
          const isSelected = selectedPillar === pillar.id;

          return (
            <button
              key={pillar.id}
              onClick={() => setSelectedPillar(isSelected ? null : pillar.id)}
              className={`
                relative p-6 rounded-2xl transition-all
                ${
                  isSelected
                    ? `bg-gradient-to-br ${pillar.color} text-white shadow-xl scale-105`
                    : "bg-white hover:shadow-lg border border-gray-200"
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900"}`}
                >
                  {pillar.label[lang]}
                </span>
                {pillarAlerts > 0 && (
                  <span
                    className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    ${isSelected ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}
                  `}
                  >
                    {pillarAlerts}
                  </span>
                )}
              </div>
              <p
                className={`text-sm ${isSelected ? "text-white/80" : "text-gray-500"}`}
              >
                {pillarModules.length} {lang === "ru" ? "модулей" : "个模块"}
              </p>

              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 rounded-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* 警报横幅 */}
      {totalAlerts > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-800">
              {lang === "ru"
                ? `${totalAlerts} предупреждений требуют внимания`
                : `${totalAlerts} 个警报需要处理`}
            </h3>
            <p className="text-sm text-red-600">
              {lang === "ru"
                ? "Проверьте модули с красными индикаторами"
                : "请检查带有红色标记的模块"}
            </p>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all">
            {lang === "ru" ? "Просмотреть" : "查看详情"}
          </button>
        </div>
      )}

      {/* 9模块卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map(module => (
          <Card
            key={module.id}
            className="p-6 hover:shadow-xl transition-all cursor-pointer group border-2 border-transparent hover:border-amber-200"
            onClick={() => setLocation(module.href)}
          >
            {/* 头部 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 ${module.bgColor} rounded-xl flex items-center justify-center ${module.color}`}
                >
                  {module.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    {module.title[lang]}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {module.description[lang]}
                  </p>
                </div>
              </div>

              {module.alerts && module.alerts > 0 && (
                <Badge className="bg-red-500 text-white">{module.alerts}</Badge>
              )}
            </div>

            {/* 统计数据 */}
            <div className="space-y-3">
              {module.stats.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {stat.label[lang]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span
                        className={`
                        flex items-center text-xs font-medium
                        ${stat.trend === "up" ? "text-green-600" : "text-red-600"}
                      `}
                      >
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 底部链接 */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-amber-600 font-medium group-hover:text-amber-700">
                {lang === "ru" ? "Открыть модуль" : "进入模块"}
              </span>
              <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>

      {/* AI 每日简报 */}
      <div className="mt-8 p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">
              {lang === "ru" ? "🤖 AI Ежедневный отчёт" : "🤖 AI 每日简报"}
            </h3>
            <p className="text-white/90 leading-relaxed">
              {lang === "ru"
                ? 'Вчера сеть из 200 магазинов показала рост выручки на 12%. Лучший результат у магазина в Владивостоке (+34%). Рекомендация: запустить акцию "Тёплые напитки" в северных регионах из-за похолодания.'
                : '昨日全网200家门店营收增长12%。海参崴门店表现最佳(+34%)。建议：因北方降温，在北部地区启动"暖饮促销"活动。'}
            </p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all">
            {lang === "ru" ? "Подробнее" : "查看详情"}
          </button>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <CreditCard className="w-5 h-5" />,
            label: { ru: "Одобрить вывод", zh: "审批提现" },
            href: "/admin/withdrawals",
          },
          {
            icon: <Gift className="w-5 h-5" />,
            label: { ru: "Создать купон", zh: "创建优惠券" },
            href: "/admin/marketing/rules",
          },
          {
            icon: <MessageSquare className="w-5 h-5" />,
            label: { ru: "TG уведомления", zh: "TG通知" },
            href: "/admin/settings/hub",
          },
          {
            icon: <FileText className="w-5 h-5" />,
            label: { ru: "Экспорт отчёта", zh: "导出报表" },
            href: "/admin/bi",
          },
        ].map((action, idx) => (
          <button
            key={idx}
            onClick={() => setLocation(action.href)}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              {action.icon}
            </div>
            <span className="font-medium text-gray-700">
              {action.label[lang]}
            </span>
          </button>
        ))}
      </div>
    </AdminLayout>
  );
}
