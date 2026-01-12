/**
 * CHUTEA 智慧中台 - AI 驾驶舱
 *
 * 功能：
 * 1. 9 模块实时状态
 * 2. AI 智能洞察
 * 3. 每日简报
 * 4. 异常预警
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ==================== 类型定义 ====================

interface ModuleStatus {
  id: string;
  name: { ru: string; zh: string };
  status: "healthy" | "warning" | "critical";
  metrics: {
    key: string;
    label: { ru: string; zh: string };
    value: number | string;
    trend?: "up" | "down" | "stable";
    trendPercent?: number;
  }[];
  alerts: {
    level: "info" | "warning" | "critical";
    message: { ru: string; zh: string };
    timestamp: string;
  }[];
}

interface AIInsight {
  id: string;
  type: "opportunity" | "risk" | "recommendation";
  priority: "high" | "medium" | "low";
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

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "AI Командный центр",
    subtitle: "Интеллектуальный анализ в реальном времени",
    summary: {
      revenue: "Выручка",
      orders: "Заказы сегодня",
      users: "Активные пользователи",
      withdrawals: "Ожидает вывода",
    },
    modules: {
      title: "Статус модулей",
      healthy: "Норма",
      warning: "Внимание",
      critical: "Критично",
    },
    insights: {
      title: "AI Инсайты",
      opportunity: "Возможность",
      risk: "Риск",
      recommendation: "Рекомендация",
      high: "Высокий",
      medium: "Средний",
      low: "Низкий",
    },
    briefing: {
      title: "Ежедневный брифинг",
      generate: "Обновить",
      generating: "Генерация...",
    },
  },
  zh: {
    title: "AI 驾驶舱",
    subtitle: "实时智能分析",
    summary: {
      revenue: "营收",
      orders: "今日订单",
      users: "活跃用户",
      withdrawals: "待提现",
    },
    modules: {
      title: "模块状态",
      healthy: "正常",
      warning: "警告",
      critical: "严重",
    },
    insights: {
      title: "AI 洞察",
      opportunity: "机会",
      risk: "风险",
      recommendation: "建议",
      high: "高",
      medium: "中",
      low: "低",
    },
    briefing: {
      title: "每日简报",
      generate: "刷新",
      generating: "生成中...",
    },
  },
};

// ==================== 模块图标 ====================

const moduleIcons: Record<string, string> = {
  finance: "💰",
  marketing: "📣",
  products: "📦",
  ai: "🤖",
  operations: "🏪",
  system: "⚙️",
  influencers: "🌟",
  shop: "🛒",
  support: "💬",
};

// ==================== 主页面组件 ====================

export default function BrainDashboardPage() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadDashboard();
    // 每 30 秒刷新一次
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await fetch("/api/brain/dashboard");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const response = await fetch("/api/brain/briefing/generate", {
        method: "POST",
      });
      const result = await response.json();
      if (result.success && data) {
        setData({
          ...data,
          briefing: result.data,
        });
      }
    } catch (error) {
      console.error("Failed to generate briefing:", error);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "opportunity":
        return "bg-green-50 border-green-200";
      case "risk":
        return "bg-red-50 border-red-200";
      case "recommendation":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return "💡";
      case "risk":
        return "⚠️";
      case "recommendation":
        return "📋";
      default:
        return "📌";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">
              {lang === "ru" ? "Загрузка..." : "加载中..."}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧠 {t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === "ru" ? "zh" : "ru")}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              {lang === "ru" ? "中文" : "Русский"}
            </button>
            <button
              onClick={loadDashboard}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm"
            >
              🔄
            </button>
          </div>
        </div>

        {/* 摘要卡片 */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">
                {data.summary.totalRevenue.toLocaleString()} ₽
              </div>
              <div className="text-green-100 text-sm mt-1">
                {t.summary.revenue}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">
                {data.summary.todayOrders}
              </div>
              <div className="text-blue-100 text-sm mt-1">
                {t.summary.orders}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">
                {data.summary.activeUsers}
              </div>
              <div className="text-purple-100 text-sm mt-1">
                {t.summary.users}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">
                {data.summary.pendingWithdrawals}
              </div>
              <div className="text-orange-100 text-sm mt-1">
                {t.summary.withdrawals}
              </div>
            </div>
          </div>
        )}

        {/* 9 模块状态 */}
        {data && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-4">{t.modules.title}</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {data.modules.map(module => (
                <div
                  key={module.id}
                  className={`rounded-xl p-3 border ${getStatusColor(module.status)} transition-all hover:shadow-md cursor-pointer`}
                >
                  <div className="text-2xl mb-1">
                    {moduleIcons[module.id] || "📦"}
                  </div>
                  <div className="text-xs font-medium truncate">
                    {module.name[lang]}
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {module.status === "healthy"
                      ? t.modules.healthy
                      : module.status === "warning"
                        ? t.modules.warning
                        : t.modules.critical}
                  </div>
                  {module.metrics.length > 0 && (
                    <div className="text-xs mt-2 font-mono">
                      {module.metrics[0].value}
                      {module.metrics[0].trend === "up" && (
                        <span className="text-green-600 ml-1">↑</span>
                      )}
                      {module.metrics[0].trend === "down" && (
                        <span className="text-red-600 ml-1">↓</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI 洞察 */}
          {data && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="text-lg font-semibold mb-4">{t.insights.title}</h2>
              <div className="space-y-3">
                {data.insights.map(insight => (
                  <div
                    key={insight.id}
                    className={`rounded-lg p-3 border ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {getInsightIcon(insight.type)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {insight.title[lang]}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(insight.priority)}`}
                          >
                            {
                              t.insights[
                                insight.priority as keyof typeof t.insights
                              ]
                            }
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {insight.description[lang]}
                        </p>
                        {insight.action && (
                          <button className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium">
                            → {insight.action[lang]}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 每日简报 */}
          {data && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t.briefing.title}</h2>
                <button
                  onClick={generateBriefing}
                  disabled={generatingBriefing}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 disabled:opacity-50"
                >
                  {generatingBriefing
                    ? t.briefing.generating
                    : t.briefing.generate}
                </button>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {data.briefing.title[lang]}
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {data.briefing.content[lang]}
                </div>
                <div className="text-xs text-gray-400 mt-3">
                  {new Date(data.briefing.generatedAt).toLocaleString(
                    lang === "ru" ? "ru-RU" : "zh-CN"
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
