/**
 * CHUTEA 智慧中台 - 达人管理
 *
 * 功能：
 * 1. 达人列表管理
 * 2. 一键生成专属跟踪链接
 * 3. 达人数据统计
 * 4. 佣金管理
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Link,
  Copy,
  Check,
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MultiLangText {
  ru: string;
  zh: string;
  en?: string;
}

interface Store {
  id: string;
  name: MultiLangText;
  code: string;
}

interface Influencer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  socialPlatform: "TELEGRAM" | "INSTAGRAM" | "TIKTOK" | "VK" | "OTHER";
  socialHandle: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  commissionRate: number;
  assignedStoreId?: string;
  trackingCode: string;
  trackingUrl: string;
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    conversionRate: number;
  };
  isActive: boolean;
  createdAt: string;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление инфлюенсерами",
    subtitle: "Партнёрская программа и отслеживание",
    influencer: {
      name: "Имя",
      phone: "Телефон",
      email: "Email",
      platform: "Платформа",
      platforms: {
        TELEGRAM: "Telegram",
        INSTAGRAM: "Instagram",
        TIKTOK: "TikTok",
        VK: "ВКонтакте",
        OTHER: "Другое",
      },
      handle: "Аккаунт",
      tier: "Уровень",
      tiers: {
        BRONZE: "Бронза",
        SILVER: "Серебро",
        GOLD: "Золото",
        PLATINUM: "Платина",
      },
      commission: "Комиссия (%)",
      store: "Магазин",
      trackingCode: "Код отслеживания",
      trackingUrl: "Ссылка отслеживания",
      status: "Статус",
      active: "Активен",
      inactive: "Неактивен",
    },
    stats: {
      totalOrders: "Всего заказов",
      totalRevenue: "Общий доход",
      totalCommission: "Общая комиссия",
      pendingCommission: "Ожидает выплаты",
      conversionRate: "Конверсия",
    },
    actions: {
      add: "Добавить инфлюенсера",
      edit: "Редактировать",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      generateLink: "Создать ссылку",
      copyLink: "Копировать",
      copied: "Скопировано!",
      viewStats: "Статистика",
    },
    messages: {
      saved: "Сохранено успешно",
      deleted: "Удалено успешно",
      linkGenerated: "Ссылка создана",
      linkCopied: "Ссылка скопирована",
      error: "Ошибка",
      loading: "Загрузка...",
      noData: "Нет инфлюенсеров",
      confirmDelete: "Удалить инфлюенсера?",
    },
    filter: {
      all: "Все",
      active: "Активные",
      byTier: "По уровню",
    },
  },
  zh: {
    title: "达人管理",
    subtitle: "合作伙伴计划和追踪",
    influencer: {
      name: "姓名",
      phone: "电话",
      email: "邮箱",
      platform: "平台",
      platforms: {
        TELEGRAM: "Telegram",
        INSTAGRAM: "Instagram",
        TIKTOK: "抖音",
        VK: "VK",
        OTHER: "其他",
      },
      handle: "账号",
      tier: "等级",
      tiers: {
        BRONZE: "青铜",
        SILVER: "白银",
        GOLD: "黄金",
        PLATINUM: "铂金",
      },
      commission: "佣金比例 (%)",
      store: "门店",
      trackingCode: "追踪码",
      trackingUrl: "追踪链接",
      status: "状态",
      active: "启用",
      inactive: "停用",
    },
    stats: {
      totalOrders: "总订单数",
      totalRevenue: "总收入",
      totalCommission: "总佣金",
      pendingCommission: "待结算",
      conversionRate: "转化率",
    },
    actions: {
      add: "添加达人",
      edit: "编辑",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      generateLink: "生成链接",
      copyLink: "复制",
      copied: "已复制！",
      viewStats: "查看统计",
    },
    messages: {
      saved: "保存成功",
      deleted: "删除成功",
      linkGenerated: "链接已生成",
      linkCopied: "链接已复制",
      error: "错误",
      loading: "加载中...",
      noData: "暂无达人",
      confirmDelete: "确定删除该达人？",
    },
    filter: {
      all: "全部",
      active: "已启用",
      byTier: "按等级",
    },
  },
};

// ==================== 等级颜色映射 ====================

const tierColors: Record<Influencer["tier"], string> = {
  BRONZE: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-700",
  GOLD: "bg-yellow-100 text-yellow-700",
  PLATINUM: "bg-purple-100 text-purple-700",
};

// ==================== 主组件 ====================

export default function InfluencerManagement() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 编辑状态
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState<string | null>(null);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载门店
      const storeRes = await fetch("/api/trpc/store.list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const storeData = await storeRes.json();
      if (storeData.result?.data) {
        setStores(storeData.result.data);
      }

      // 加载达人
      const res = await fetch("/api/trpc/marketing.listInfluencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.result?.data) {
        setInfluencers(data.result.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      // 使用模拟数据
      setStores([
        { id: "1", name: { ru: "Центральный", zh: "中央店" }, code: "CTR" },
        { id: "2", name: { ru: "Северный", zh: "北区店" }, code: "NTH" },
        { id: "3", name: { ru: "Южный", zh: "南区店" }, code: "STH" },
      ]);
      setInfluencers([
        {
          id: "1",
          name: "Анна Иванова",
          phone: "+7 999 123 4567",
          email: "anna@example.com",
          socialPlatform: "INSTAGRAM",
          socialHandle: "@anna_tea",
          tier: "GOLD",
          commissionRate: 10,
          assignedStoreId: "1",
          trackingCode: "ANNA2026",
          trackingUrl: "https://chutea.cc/?ref=ANNA2026&store=CTR",
          stats: {
            totalOrders: 156,
            totalRevenue: 48500,
            totalCommission: 4850,
            pendingCommission: 1200,
            conversionRate: 3.2,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Максим Петров",
          phone: "+7 999 234 5678",
          socialPlatform: "TELEGRAM",
          socialHandle: "@max_drinks",
          tier: "SILVER",
          commissionRate: 7,
          assignedStoreId: "2",
          trackingCode: "MAX2026",
          trackingUrl: "https://chutea.cc/?ref=MAX2026&store=NTH",
          stats: {
            totalOrders: 89,
            totalRevenue: 26700,
            totalCommission: 1869,
            pendingCommission: 500,
            conversionRate: 2.1,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "3",
          name: "李小明",
          phone: "+7 999 345 6789",
          socialPlatform: "TIKTOK",
          socialHandle: "@xiaoming_tea",
          tier: "BRONZE",
          commissionRate: 5,
          trackingCode: "XMING2026",
          trackingUrl: "https://chutea.cc/?ref=XMING2026",
          stats: {
            totalOrders: 23,
            totalRevenue: 6900,
            totalCommission: 345,
            pendingCommission: 345,
            conversionRate: 1.5,
          },
          isActive: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 生成追踪码
  const generateTrackingCode = (name: string): string => {
    const cleanName = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const year = new Date().getFullYear();
    return `${cleanName}${year}`;
  };

  // 生成追踪链接
  const generateTrackingUrl = (code: string, storeId?: string): string => {
    const store = stores.find(s => s.id === storeId);
    const baseUrl = "https://chutea.cc/";
    if (store) {
      return `${baseUrl}?ref=${code}&store=${store.code}`;
    }
    return `${baseUrl}?ref=${code}`;
  };

  // 保存达人
  const saveInfluencer = async (influencer: Influencer) => {
    try {
      const isNew = !influencer.id || influencer.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/marketing.createInfluencer"
        : "/api/trpc/marketing.updateInfluencer";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(influencer),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setInfluencers([...influencers, data.result.data]);
        } else {
          setInfluencers(
            influencers.map(i =>
              i.id === influencer.id ? data.result.data : i
            )
          );
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!influencer.id || influencer.id.startsWith("new-")) {
        const newInfluencer = {
          ...influencer,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setInfluencers([...influencers, newInfluencer]);
      } else {
        setInfluencers(
          influencers.map(i => (i.id === influencer.id ? influencer : i))
        );
      }
      showMessage("success", t.messages.saved);
    }
    setEditingInfluencer(null);
    setShowForm(false);
  };

  // 删除达人
  const deleteInfluencer = async (id: string) => {
    if (!confirm(t.messages.confirmDelete)) return;

    try {
      await fetch("/api/trpc/marketing.deleteInfluencer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setInfluencers(influencers.filter(i => i.id !== id));
    showMessage("success", t.messages.deleted);
  };

  // 复制链接
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showMessage("success", t.messages.linkCopied);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // 过滤达人
  const filteredInfluencers = influencers.filter(i => {
    if (filter === "active") return i.isActive;
    return true;
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👥 {t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === "ru" ? "zh" : "ru")}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              {lang === "ru" ? "中文" : "Русский"}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {influencers.length}
                </div>
                <div className="text-sm text-gray-500">
                  {lang === "ru" ? "Всего инфлюенсеров" : "总达人数"}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {influencers.reduce((sum, i) => sum + i.stats.totalOrders, 0)}
                </div>
                <div className="text-sm text-gray-500">
                  {t.stats.totalOrders}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {influencers
                    .reduce((sum, i) => sum + i.stats.totalRevenue, 0)
                    .toLocaleString()}{" "}
                  ₽
                </div>
                <div className="text-sm text-gray-500">
                  {t.stats.totalRevenue}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {influencers
                    .reduce((sum, i) => sum + i.stats.pendingCommission, 0)
                    .toLocaleString()}{" "}
                  ₽
                </div>
                <div className="text-sm text-gray-500">
                  {t.stats.pendingCommission}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            {(["all", "active"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.filter[f]}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const newCode = generateTrackingCode("NEW");
              setEditingInfluencer({
                id: `new-${Date.now()}`,
                name: "",
                phone: "",
                socialPlatform: "TELEGRAM",
                socialHandle: "",
                tier: "BRONZE",
                commissionRate: 5,
                trackingCode: newCode,
                trackingUrl: generateTrackingUrl(newCode),
                stats: {
                  totalOrders: 0,
                  totalRevenue: 0,
                  totalCommission: 0,
                  pendingCommission: 0,
                  conversionRate: 0,
                },
                isActive: true,
                createdAt: new Date().toISOString(),
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t.actions.add}
          </button>
        </div>

        {/* 达人列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.loading}
            </div>
          ) : filteredInfluencers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.noData}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.influencer.name}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.influencer.platform}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.influencer.tier}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.influencer.trackingUrl}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.stats.totalOrders}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.influencer.status}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    {t.actions.edit}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInfluencers.map(influencer => (
                  <tr key={influencer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {influencer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {influencer.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">
                          {t.influencer.platforms[influencer.socialPlatform]}
                        </span>
                        <a
                          href={`https://${influencer.socialPlatform.toLowerCase()}.com/${influencer.socialHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {influencer.socialHandle}
                          <ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${tierColors[influencer.tier]}`}
                      >
                        {t.influencer.tiers[influencer.tier]}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {influencer.commissionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 max-w-[200px] truncate">
                          {influencer.trackingUrl}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              influencer.trackingUrl,
                              influencer.id
                            )
                          }
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          {copiedId === influencer.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setShowStats(influencer.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {influencer.stats.totalOrders}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          influencer.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {influencer.isActive
                          ? t.influencer.active
                          : t.influencer.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingInfluencer(influencer);
                            setShowForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteInfluencer(influencer.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 统计弹窗 */}
        {showStats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              {(() => {
                const inf = influencers.find(i => i.id === showStats);
                if (!inf) return null;
                return (
                  <>
                    <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900">
                        {inf.name} - {t.actions.viewStats}
                      </h3>
                      <button
                        onClick={() => setShowStats(null)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {inf.stats.totalOrders}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t.stats.totalOrders}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {inf.stats.conversionRate}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {t.stats.conversionRate}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {inf.stats.totalRevenue.toLocaleString()} ₽
                          </div>
                          <div className="text-sm text-gray-500">
                            {t.stats.totalRevenue}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-gray-900">
                            {inf.stats.totalCommission.toLocaleString()} ₽
                          </div>
                          <div className="text-sm text-gray-500">
                            {t.stats.totalCommission}
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-700">
                          {inf.stats.pendingCommission.toLocaleString()} ₽
                        </div>
                        <div className="text-sm text-yellow-600">
                          {t.stats.pendingCommission}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* 编辑表单 */}
        {showForm && editingInfluencer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingInfluencer.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingInfluencer(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.name}
                    </label>
                    <input
                      type="text"
                      value={editingInfluencer.name}
                      onChange={e => {
                        const name = e.target.value;
                        const code = generateTrackingCode(name);
                        setEditingInfluencer({
                          ...editingInfluencer,
                          name,
                          trackingCode: code,
                          trackingUrl: generateTrackingUrl(
                            code,
                            editingInfluencer.assignedStoreId
                          ),
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.phone}
                    </label>
                    <input
                      type="text"
                      value={editingInfluencer.phone}
                      onChange={e =>
                        setEditingInfluencer({
                          ...editingInfluencer,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 社交平台 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.platform}
                    </label>
                    <select
                      value={editingInfluencer.socialPlatform}
                      onChange={e =>
                        setEditingInfluencer({
                          ...editingInfluencer,
                          socialPlatform: e.target
                            .value as Influencer["socialPlatform"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {Object.entries(t.influencer.platforms).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.handle}
                    </label>
                    <input
                      type="text"
                      value={editingInfluencer.socialHandle}
                      onChange={e =>
                        setEditingInfluencer({
                          ...editingInfluencer,
                          socialHandle: e.target.value,
                        })
                      }
                      placeholder="@username"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 等级和佣金 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.tier}
                    </label>
                    <select
                      value={editingInfluencer.tier}
                      onChange={e =>
                        setEditingInfluencer({
                          ...editingInfluencer,
                          tier: e.target.value as Influencer["tier"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {Object.entries(t.influencer.tiers).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.influencer.commission}
                    </label>
                    <input
                      type="number"
                      value={editingInfluencer.commissionRate}
                      onChange={e =>
                        setEditingInfluencer({
                          ...editingInfluencer,
                          commissionRate: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                      max={100}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 门店 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.influencer.store}
                  </label>
                  <select
                    value={editingInfluencer.assignedStoreId || ""}
                    onChange={e => {
                      const storeId = e.target.value || undefined;
                      setEditingInfluencer({
                        ...editingInfluencer,
                        assignedStoreId: storeId,
                        trackingUrl: generateTrackingUrl(
                          editingInfluencer.trackingCode,
                          storeId
                        ),
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">
                      {lang === "ru" ? "Все магазины" : "所有门店"}
                    </option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name[lang]} ({store.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 追踪链接 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.influencer.trackingUrl}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingInfluencer.trackingUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(editingInfluencer.trackingUrl, "form")
                      }
                      className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {copiedId === "form" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.influencer.status}
                  </label>
                  <select
                    value={editingInfluencer.isActive ? "active" : "inactive"}
                    onChange={e =>
                      setEditingInfluencer({
                        ...editingInfluencer,
                        isActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">{t.influencer.active}</option>
                    <option value="inactive">{t.influencer.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingInfluencer(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveInfluencer(editingInfluencer)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {t.actions.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
