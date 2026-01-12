/**
 * BI 数据分析中心
 *
 * DeepSeek AI 驱动的商业智能分析界面
 * 功能：
 * 1. 自然语言查询 (Text-to-SQL)
 * 2. 销售异常检测
 * 3. 达人 ROI 分析
 * 4. 库存预警
 * 5. 跨组织财务审计
 */

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Settings,
} from "lucide-react";

// ==================== 多语言翻译 ====================
const translations = {
  ru: {
    title: "BI Аналитический центр",
    subtitle: "Интеллектуальный анализ данных на базе DeepSeek AI",
    tabs: {
      query: "Запрос данных",
      sales: "Анализ продаж",
      influencer: "ROI инфлюенсеров",
      inventory: "Прогноз запасов",
      audit: "Финансовый аудит",
      settings: "Настройки AI",
    },
    query: {
      placeholder:
        "Задайте вопрос о данных... Например: Какие товары продавались лучше всего на прошлой неделе?",
      submit: "Анализировать",
      results: "Результаты",
      sqlQuery: "SQL запрос",
      analysis: "Анализ",
      noResults: "Нет результатов",
    },
    sales: {
      title: "Обнаружение аномалий продаж",
      description: "AI анализирует данные продаж для выявления аномалий",
      analyze: "Запустить анализ",
      dateRange: "Период анализа",
      anomalies: "Обнаруженные аномалии",
      noAnomalies: "Аномалий не обнаружено",
    },
    influencer: {
      title: "Анализ ROI инфлюенсеров",
      description: "Оценка эффективности маркетинга инфлюенсеров",
      analyze: "Анализировать",
      metrics: "Метрики",
      performance: "Производительность",
      recommendation: "Рекомендация",
    },
    inventory: {
      title: "Прогноз запасов",
      description: "Прогнозирование потребности в запасах на основе AI",
      predict: "Прогнозировать",
      forecastDays: "Дней прогноза",
      predictions: "Прогнозы",
      urgency: "Срочность",
    },
    audit: {
      title: "Межорганизационный аудит",
      description: "Проверка финансовой изоляции между организациями",
      audit: "Запустить аудит",
      findings: "Результаты",
      complianceScore: "Оценка соответствия",
    },
    settings: {
      title: "Настройки DeepSeek AI",
      connectionStatus: "Статус подключения",
      testConnection: "Тест подключения",
      connected: "Подключено",
      disconnected: "Отключено",
      latency: "Задержка",
      model: "Модель",
    },
    common: {
      loading: "Загрузка...",
      error: "Ошибка",
      success: "Успешно",
      severity: {
        LOW: "Низкая",
        MEDIUM: "Средняя",
        HIGH: "Высокая",
        CRITICAL: "Критическая",
      },
      performance: {
        EXCELLENT: "Отлично",
        GOOD: "Хорошо",
        AVERAGE: "Средне",
        POOR: "Плохо",
      },
    },
  },
  zh: {
    title: "BI 数据分析中心",
    subtitle: "DeepSeek AI 驱动的智能数据分析",
    tabs: {
      query: "数据查询",
      sales: "销售分析",
      influencer: "达人ROI",
      inventory: "库存预测",
      audit: "财务审计",
      settings: "AI设置",
    },
    query: {
      placeholder:
        "输入您的问题... 例如：上周哪些商品销量最好？莫斯科店和购物中心店的利润差在哪里？",
      submit: "分析",
      results: "查询结果",
      sqlQuery: "SQL 查询",
      analysis: "AI 分析",
      noResults: "暂无结果",
    },
    sales: {
      title: "销售异常检测",
      description: "AI 分析销售数据，自动识别异常订单或业绩波动",
      analyze: "开始分析",
      dateRange: "分析时间范围",
      anomalies: "检测到的异常",
      noAnomalies: "未检测到异常",
    },
    influencer: {
      title: "达人 ROI 分析",
      description: "评估各达人的获客成本与利润贡献",
      analyze: "分析",
      metrics: "指标",
      performance: "表现",
      recommendation: "建议",
    },
    inventory: {
      title: "库存预测与预警",
      description: "基于历史销售数据预测原材料消耗趋势",
      predict: "预测",
      forecastDays: "预测天数",
      predictions: "预测结果",
      urgency: "紧急程度",
    },
    audit: {
      title: "跨组织财务审计",
      description: "检查积分和优惠券是否跨组织冒用",
      audit: "开始审计",
      findings: "审计发现",
      complianceScore: "合规评分",
    },
    settings: {
      title: "DeepSeek AI 设置",
      connectionStatus: "连接状态",
      testConnection: "测试连接",
      connected: "已连接",
      disconnected: "未连接",
      latency: "延迟",
      model: "模型",
    },
    common: {
      loading: "加载中...",
      error: "错误",
      success: "成功",
      severity: {
        LOW: "低",
        MEDIUM: "中",
        HIGH: "高",
        CRITICAL: "紧急",
      },
      performance: {
        EXCELLENT: "优秀",
        GOOD: "良好",
        AVERAGE: "一般",
        POOR: "较差",
      },
    },
  },
};

type Language = "ru" | "zh";

// ==================== 类型定义 ====================
interface ConnectionStatus {
  success: boolean;
  model?: string;
  latency?: number;
  error?: string;
}

interface QueryResult {
  success: boolean;
  query?: string;
  explanation?: string;
  results?: unknown[];
  analysis?: string;
  error?: string;
}

interface SalesAnomaly {
  type: string;
  severity: string;
  description: string;
  affectedStore?: string;
  suggestedAction: string;
}

interface InfluencerAnalysis {
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
  performance: string;
  recommendation: string;
}

interface InventoryPrediction {
  productId: string;
  productName: string;
  predictedDemand: number;
  suggestedReorderQuantity: number;
  urgency: string;
  reasoning: string;
}

interface AuditFinding {
  type: string;
  severity: string;
  description: string;
  affectedOrgs: string[];
  recommendation: string;
}

// ==================== 主组件 ====================
export default function BIAnalysisHub() {
  const [language] = useState<Language>("zh");
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<
    "query" | "sales" | "influencer" | "inventory" | "audit" | "settings"
  >("query");
  const [loading, setLoading] = useState(false);
  const [orgId] = useState("default-org");

  // 连接状态
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);

  // 自然语言查询
  const [queryInput, setQueryInput] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // 销售异常
  const [salesAnomalies, setSalesAnomalies] = useState<SalesAnomaly[]>([]);
  const [salesSummary, setSalesSummary] = useState("");

  // 达人分析
  const [influencerAnalysis, setInfluencerAnalysis] = useState<
    InfluencerAnalysis[]
  >([]);
  const [influencerSummary, setInfluencerSummary] = useState("");

  // 库存预测
  const [inventoryPredictions, setInventoryPredictions] = useState<
    InventoryPrediction[]
  >([]);
  const [inventorySummary, setInventorySummary] = useState("");
  const [forecastDays, setForecastDays] = useState(7);

  // 审计结果
  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([]);
  const [auditSummary, setAuditSummary] = useState("");
  const [complianceScore, setComplianceScore] = useState<number | null>(null);

  // 测试连接
  const testConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/bi.testConnection");
      const data = await res.json();
      setConnectionStatus(data.result?.data || { success: false });
    } catch {
      setConnectionStatus({ success: false, error: "Connection failed" });
    }
    setLoading(false);
  };

  // 自然语言查询
  const executeQuery = async () => {
    if (!queryInput.trim()) return;
    setLoading(true);
    setQueryResult(null);

    try {
      const res = await fetch("/api/trpc/bi.naturalLanguageQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryInput, orgId }),
      });
      const data = await res.json();
      setQueryResult(data.result?.data || { success: false, error: "Failed" });
    } catch {
      setQueryResult({ success: false, error: "Query failed" });
    }
    setLoading(false);
  };

  // 销售异常检测
  const detectSalesAnomalies = async () => {
    setLoading(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
      const res = await fetch("/api/trpc/bi.detectSalesAnomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      const data = await res.json();
      const result = data.result?.data;
      if (result?.success) {
        setSalesAnomalies(result.anomalies || []);
        setSalesSummary(result.summary || "");
      }
    } catch {
      setSalesSummary("Analysis failed");
    }
    setLoading(false);
  };

  // 达人 ROI 分析
  const analyzeInfluencerROI = async () => {
    setLoading(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
      const res = await fetch("/api/trpc/bi.analyzeInfluencerROI", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      const data = await res.json();
      const result = data.result?.data;
      if (result?.success) {
        setInfluencerAnalysis(result.analysis || []);
        setInfluencerSummary(result.summary || "");
      }
    } catch {
      setInfluencerSummary("Analysis failed");
    }
    setLoading(false);
  };

  // 库存预测
  const predictInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/bi.predictInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, forecastDays }),
      });
      const data = await res.json();
      const result = data.result?.data;
      if (result?.success) {
        setInventoryPredictions(result.predictions || []);
        setInventorySummary(result.summary || "");
      }
    } catch {
      setInventorySummary("Prediction failed");
    }
    setLoading(false);
  };

  // 跨组织审计
  const runCrossOrgAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/bi.auditCrossOrg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgIds: [orgId] }),
      });
      const data = await res.json();
      const result = data.result?.data;
      if (result?.success) {
        setAuditFindings(result.findings || []);
        setAuditSummary(result.summary || "");
        setComplianceScore(result.complianceScore);
      }
    } catch {
      setAuditSummary("Audit failed");
    }
    setLoading(false);
  };

  // 初始化测试连接
  useEffect(() => {
    testConnection();
  }, []);

  // 严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 表现颜色
  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "EXCELLENT":
        return "text-green-600";
      case "GOOD":
        return "text-blue-600";
      case "AVERAGE":
        return "text-yellow-600";
      case "POOR":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const tabs = [
    { id: "query", label: t.tabs.query, icon: Search },
    { id: "sales", label: t.tabs.sales, icon: TrendingUp },
    { id: "influencer", label: t.tabs.influencer, icon: Users },
    { id: "inventory", label: t.tabs.inventory, icon: Package },
    { id: "audit", label: t.tabs.audit, icon: DollarSign },
    { id: "settings", label: t.tabs.settings, icon: Settings },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-[oklch(0.38_0.06_220)]" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* 连接状态指示器 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connectionStatus?.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">
              DeepSeek:{" "}
              {connectionStatus?.success
                ? t.settings.connected
                : t.settings.disconnected}
            </span>
            {connectionStatus?.latency && (
              <span className="text-xs text-gray-500">
                ({connectionStatus.latency}ms)
              </span>
            )}
          </div>
          <button
            onClick={testConnection}
            disabled={loading}
            className="text-sm text-[oklch(0.38_0.06_220)] hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t.settings.testConnection}
          </button>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[oklch(0.38_0.06_220)] text-[oklch(0.38_0.06_220)]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 自然语言查询 */}
        {activeTab === "query" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && executeQuery()}
                  placeholder={t.query.placeholder}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.38_0.06_220)] focus:border-transparent"
                />
                <button
                  onClick={executeQuery}
                  disabled={loading || !queryInput.trim()}
                  className="px-6 py-3 bg-[oklch(0.38_0.06_220)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {t.query.submit}
                </button>
              </div>
            </div>

            {queryResult && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                {queryResult.error ? (
                  <div className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {queryResult.error}
                  </div>
                ) : (
                  <>
                    {queryResult.explanation && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">
                          {t.query.sqlQuery}
                        </h3>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                          {queryResult.query}
                        </pre>
                        <p className="text-sm text-gray-600 mt-2">
                          {queryResult.explanation}
                        </p>
                      </div>
                    )}

                    {queryResult.results && queryResult.results.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">
                          {t.query.results}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {Object.keys(
                                  queryResult.results[0] as object
                                ).map(key => (
                                  <th
                                    key={key}
                                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {queryResult.results.map((row, idx) => (
                                <tr key={idx}>
                                  {Object.values(row as object).map(
                                    (val, i) => (
                                      <td
                                        key={i}
                                        className="px-4 py-2 text-sm text-gray-900"
                                      >
                                        {String(val)}
                                      </td>
                                    )
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {queryResult.analysis && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">
                          {t.query.analysis}
                        </h3>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {queryResult.analysis}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 销售异常检测 */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{t.sales.title}</h2>
                  <p className="text-gray-600 text-sm">{t.sales.description}</p>
                </div>
                <button
                  onClick={detectSalesAnomalies}
                  disabled={loading}
                  className="px-4 py-2 bg-[oklch(0.38_0.06_220)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  {t.sales.analyze}
                </button>
              </div>

              {salesSummary && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700">{salesSummary}</p>
                </div>
              )}

              {salesAnomalies.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-medium">{t.sales.anomalies}</h3>
                  {salesAnomalies.map((anomaly, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(anomaly.severity)}`}
                        >
                          {
                            t.common.severity[
                              anomaly.severity as keyof typeof t.common.severity
                            ]
                          }
                        </span>
                        <span className="text-sm text-gray-500">
                          {anomaly.type}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">
                        {anomaly.description}
                      </p>
                      <p className="text-sm text-blue-600">
                        {anomaly.suggestedAction}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                salesSummary && (
                  <p className="text-gray-500">{t.sales.noAnomalies}</p>
                )
              )}
            </div>
          </div>
        )}

        {/* 达人 ROI 分析 */}
        {activeTab === "influencer" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t.influencer.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {t.influencer.description}
                  </p>
                </div>
                <button
                  onClick={analyzeInfluencerROI}
                  disabled={loading}
                  className="px-4 py-2 bg-[oklch(0.38_0.06_220)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  {t.influencer.analyze}
                </button>
              </div>

              {influencerSummary && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700">{influencerSummary}</p>
                </div>
              )}

              {influencerAnalysis.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          达人
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          等级
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          点击
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          订单
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          转化率
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          ROI
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.influencer.performance}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.influencer.recommendation}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {influencerAnalysis.map(inf => (
                        <tr key={inf.influencerId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {inf.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {inf.tier}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {inf.metrics.totalClicks}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {inf.metrics.totalOrders}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {inf.metrics.conversionRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {inf.metrics.roi.toFixed(0)}%
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium ${getPerformanceColor(inf.performance)}`}
                          >
                            {
                              t.common.performance[
                                inf.performance as keyof typeof t.common.performance
                              ]
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {inf.recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 库存预测 */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{t.inventory.title}</h2>
                  <p className="text-gray-600 text-sm">
                    {t.inventory.description}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      {t.inventory.forecastDays}:
                    </label>
                    <select
                      value={forecastDays}
                      onChange={e => setForecastDays(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value={7}>7</option>
                      <option value={14}>14</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  <button
                    onClick={predictInventory}
                    disabled={loading}
                    className="px-4 py-2 bg-[oklch(0.38_0.06_220)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                    {t.inventory.predict}
                  </button>
                </div>
              </div>

              {inventorySummary && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700">{inventorySummary}</p>
                </div>
              )}

              {inventoryPredictions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">{t.inventory.predictions}</h3>
                  {inventoryPredictions.map((pred, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{pred.productName}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(pred.urgency)}`}
                        >
                          {
                            t.common.severity[
                              pred.urgency as keyof typeof t.common.severity
                            ]
                          }
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">预测需求:</span>{" "}
                          {pred.predictedDemand}
                        </div>
                        <div>
                          <span className="text-gray-500">建议补货:</span>{" "}
                          {pred.suggestedReorderQuantity}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{pred.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 跨组织审计 */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{t.audit.title}</h2>
                  <p className="text-gray-600 text-sm">{t.audit.description}</p>
                </div>
                <button
                  onClick={runCrossOrgAudit}
                  disabled={loading}
                  className="px-4 py-2 bg-[oklch(0.38_0.06_220)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  {t.audit.audit}
                </button>
              </div>

              {complianceScore !== null && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-[oklch(0.38_0.06_220)]">
                      {complianceScore}/100
                    </div>
                    <div>
                      <div className="font-medium">
                        {t.audit.complianceScore}
                      </div>
                      <p className="text-gray-600 text-sm">{auditSummary}</p>
                    </div>
                  </div>
                </div>
              )}

              {auditFindings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">{t.audit.findings}</h3>
                  {auditFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}
                        >
                          {
                            t.common.severity[
                              finding.severity as keyof typeof t.common.severity
                            ]
                          }
                        </span>
                        <span className="text-sm text-gray-500">
                          {finding.type}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">
                        {finding.description}
                      </p>
                      <p className="text-sm text-blue-600">
                        {finding.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI 设置 */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">{t.settings.title}</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {t.settings.connectionStatus}
                    </div>
                    <div className="text-sm text-gray-500">
                      {connectionStatus?.model &&
                        `${t.settings.model}: ${connectionStatus.model}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {connectionStatus?.success ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        {t.settings.connected}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        {t.settings.disconnected}
                      </span>
                    )}
                    {connectionStatus?.latency && (
                      <span className="text-sm text-gray-500">
                        {t.settings.latency}: {connectionStatus.latency}ms
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-2">API 配置</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    DeepSeek API Key 需要在服务器 .env 文件中配置
                    (DEEPSEEK_API_KEY)
                  </p>
                  <div className="text-sm text-gray-500">
                    <div>
                      API Endpoint: https://api.deepseek.com/v1/chat/completions
                    </div>
                    <div>Model: deepseek-chat</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
