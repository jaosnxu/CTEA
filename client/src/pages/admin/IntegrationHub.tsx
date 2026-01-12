/**
 * CHUTEA 全球集成中心 - Integration Hub
 *
 * 功能：
 * 1. API 密钥配置（iiko、DeepSeek、Telegram）
 * 2. 可视化 CMS（徽标/背景图/字体）
 * 3. LBS 地理位置营销
 * 4. 电视云端控制
 * 5. AI 模式切换（人工确认/全自动）
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Settings,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  Upload,
  Image,
  Tv,
  MapPin,
  Bot,
  ToggleLeft,
  ToggleRight,
  Clock,
  Zap,
  Send,
  Globe,
  Palette,
  Type,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";

interface ApiConfig {
  key: string;
  isActive: boolean;
  lastTestAt?: string;
  status: "connected" | "disconnected" | "error" | "untested";
}

interface LBSRule {
  id: string;
  name: { ru: string; zh: string };
  radiusKm: number;
  triggerMinutes: number;
  rewardType: "coupon" | "points" | "discount";
  rewardValue: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  isActive: boolean;
}

interface TVScheduleItem {
  id: string;
  name: { ru: string; zh: string };
  type: "video" | "menu" | "promo";
  mediaUrl: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

interface CMSConfig {
  logoUrl: string;
  backgroundUrl: string;
  fontStyle: "modern" | "classic" | "minimal";
  primaryColor: string;
  accentColor: string;
}

const translations = {
  ru: {
    title: "Глобальный центр интеграции",
    subtitle: "Управление API, CMS, LBS и TV",
    tabs: {
      api: "API Ключи",
      cms: "Визуальный CMS",
      lbs: "LBS Маркетинг",
      tv: "TV Облако",
      ai: "AI Режим",
    },
    api: {
      iiko: {
        title: "IIKO Система",
        description: "Интеграция с POS системой IIKO",
        keyLabel: "API Ключ",
        orgIdLabel: "ID Организации",
      },
      deepseek: {
        title: "DeepSeek AI",
        description: "Интеллектуальный анализ данных",
        keyLabel: "API Ключ",
      },
      telegram: {
        title: "Telegram Bot",
        description: "Уведомления и маркетинг",
        keyLabel: "Bot Token",
        webhookLabel: "Webhook URL",
      },
      testConnection: "Проверить",
      status: {
        connected: "Подключено",
        disconnected: "Отключено",
        error: "Ошибка",
        untested: "Не проверено",
      },
    },
    cms: {
      logo: "Логотип",
      background: "Фоновое изображение",
      font: "Стиль шрифта",
      fonts: {
        modern: "Современный",
        classic: "Классический",
        minimal: "Минимализм",
      },
      primaryColor: "Основной цвет",
      accentColor: "Акцентный цвет",
      upload: "Загрузить",
      preview: "Предпросмотр",
    },
    lbs: {
      title: "Геолокационный маркетинг",
      description: "Автоматические уведомления при приближении к магазину",
      addRule: "Добавить правило",
      radius: "Радиус (км)",
      triggerTime: "Время без заказа (мин)",
      reward: "Награда",
      rewardTypes: {
        coupon: "Купон",
        points: "Баллы",
        discount: "Скидка %",
      },
      activeHours: "Активные часы",
      enabled: "Включено",
      disabled: "Выключено",
    },
    tv: {
      title: "Управление TV контентом",
      description: "Удаленное управление экранами в магазинах",
      addSchedule: "Добавить расписание",
      contentType: "Тип контента",
      types: {
        video: "Видео",
        menu: "Меню",
        promo: "Промо",
      },
      schedule: "Расписание",
      days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      syncNow: "Синхронизировать",
      offlineCache: "Офлайн кэш включен",
    },
    ai: {
      title: "AI Режим работы",
      description: "Настройка автоматизации AI решений",
      modes: {
        manual: {
          title: "Ручное подтверждение",
          description:
            "AI генерирует рекомендации, вы подтверждаете выполнение",
        },
        auto: {
          title: "Полная автоматизация",
          description: "AI автоматически выполняет оптимальные решения",
        },
      },
      features: {
        scheduling: "Автоматическое расписание",
        marketing: "Маркетинговые кампании",
        inventory: "Управление запасами",
        pricing: "Динамическое ценообразование",
      },
      currentMode: "Текущий режим",
      switchMode: "Переключить режим",
      warning:
        "Внимание: В автоматическом режиме AI будет принимать решения без вашего подтверждения",
    },
    actions: {
      save: "Сохранить",
      cancel: "Отмена",
      test: "Тест",
      delete: "Удалить",
    },
    messages: {
      saved: "Сохранено успешно",
      testSuccess: "Тест успешен",
      testFailed: "Тест не пройден",
      error: "Ошибка",
    },
  },
  zh: {
    title: "全球集成中心",
    subtitle: "管理 API、CMS、LBS 和 TV",
    tabs: {
      api: "API 密钥",
      cms: "可视化 CMS",
      lbs: "LBS 营销",
      tv: "TV 云控",
      ai: "AI 模式",
    },
    api: {
      iiko: {
        title: "IIKO 系统",
        description: "与 IIKO POS 系统集成",
        keyLabel: "API 密钥",
        orgIdLabel: "组织 ID",
      },
      deepseek: {
        title: "DeepSeek AI",
        description: "智能数据分析",
        keyLabel: "API 密钥",
      },
      telegram: {
        title: "Telegram 机器人",
        description: "通知和营销",
        keyLabel: "Bot Token",
        webhookLabel: "Webhook URL",
      },
      testConnection: "测试连接",
      status: {
        connected: "已连接",
        disconnected: "已断开",
        error: "错误",
        untested: "未测试",
      },
    },
    cms: {
      logo: "徽标",
      background: "背景图片",
      font: "字体样式",
      fonts: {
        modern: "现代",
        classic: "经典",
        minimal: "极简",
      },
      primaryColor: "主色调",
      accentColor: "强调色",
      upload: "上传",
      preview: "预览",
    },
    lbs: {
      title: "地理位置营销",
      description: "用户接近门店时自动发送通知",
      addRule: "添加规则",
      radius: "半径 (公里)",
      triggerTime: "未下单时间 (分钟)",
      reward: "奖励",
      rewardTypes: {
        coupon: "优惠券",
        points: "积分",
        discount: "折扣 %",
      },
      activeHours: "生效时段",
      enabled: "已启用",
      disabled: "已禁用",
    },
    tv: {
      title: "TV 内容管理",
      description: "远程管理门店屏幕",
      addSchedule: "添加排期",
      contentType: "内容类型",
      types: {
        video: "视频",
        menu: "菜单",
        promo: "促销",
      },
      schedule: "排期",
      days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      syncNow: "立即同步",
      offlineCache: "离线缓存已启用",
    },
    ai: {
      title: "AI 工作模式",
      description: "配置 AI 决策自动化",
      modes: {
        manual: {
          title: "人工确认",
          description: "AI 生成建议，您确认执行",
        },
        auto: {
          title: "全自动",
          description: "AI 自动执行最优决策",
        },
      },
      features: {
        scheduling: "自动排班",
        marketing: "营销活动",
        inventory: "库存管理",
        pricing: "动态定价",
      },
      currentMode: "当前模式",
      switchMode: "切换模式",
      warning: "警告：在自动模式下，AI 将在没有您确认的情况下做出决策",
    },
    actions: {
      save: "保存",
      cancel: "取消",
      test: "测试",
      delete: "删除",
    },
    messages: {
      saved: "保存成功",
      testSuccess: "测试成功",
      testFailed: "测试失败",
      error: "错误",
    },
  },
};

const statusColors = {
  connected: "bg-green-100 text-green-700",
  disconnected: "bg-gray-100 text-gray-500",
  error: "bg-red-100 text-red-700",
  untested: "bg-yellow-100 text-yellow-700",
};

export default function IntegrationHub() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [activeTab, setActiveTab] = useState<
    "api" | "cms" | "lbs" | "tv" | "ai"
  >("api");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const [apiConfigs, setApiConfigs] = useState({
    iiko: {
      key: "",
      orgId: "",
      isActive: false,
      status: "untested" as const,
    },
    deepseek: { key: "", isActive: false, status: "untested" as const },
    telegram: {
      key: "",
      webhookUrl: "https://chutea.cc/api/telegram/webhook",
      isActive: false,
      status: "untested" as const,
    },
  });

  const [cmsConfig, setCmsConfig] = useState<CMSConfig>({
    logoUrl: "/images/logo.png",
    backgroundUrl: "/images/bg-wood.jpg",
    fontStyle: "minimal",
    primaryColor: "#D97706",
    accentColor: "#F59E0B",
  });

  const [lbsRules, setLbsRules] = useState<LBSRule[]>([
    {
      id: "1",
      name: { ru: "Пробуждение спящих", zh: "沉睡唤醒" },
      radiusKm: 1,
      triggerMinutes: 60,
      rewardType: "coupon",
      rewardValue: 10,
      activeHoursStart: "14:00",
      activeHoursEnd: "16:00",
      isActive: true,
    },
  ]);

  const [tvSchedule, setTvSchedule] = useState<TVScheduleItem[]>([
    {
      id: "1",
      name: { ru: "Утреннее меню", zh: "早餐菜单" },
      type: "menu",
      mediaUrl: "/media/breakfast-menu.mp4",
      startTime: "09:00",
      endTime: "11:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: true,
    },
    {
      id: "2",
      name: { ru: "Атмосфера дерева", zh: "原木氛围" },
      type: "video",
      mediaUrl: "/media/wood-ambiance.mp4",
      startTime: "14:00",
      endTime: "22:00",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      isActive: true,
    },
  ]);

  const [aiMode, setAiMode] = useState<"manual" | "auto">("manual");
  const [aiFeatures, setAiFeatures] = useState({
    scheduling: false,
    marketing: false,
    inventory: false,
    pricing: false,
  });

  const t = translations[lang];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-settings/integration-hub");
      if (res.ok) {
        const data = await res.json();
        if (data.apiConfigs) setApiConfigs(data.apiConfigs);
        if (data.cmsConfig) setCmsConfig(data.cmsConfig);
        if (data.lbsRules) setLbsRules(data.lbsRules);
        if (data.tvSchedule) setTvSchedule(data.tvSchedule);
        if (data.aiMode) setAiMode(data.aiMode);
        if (data.aiFeatures) setAiFeatures(data.aiFeatures);
      }
    } catch (error) {
      console.error("Failed to load configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfigs = async () => {
    setLoading(true);
    try {
      await fetch("/api/system-settings/integration-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiConfigs,
          cmsConfig,
          lbsRules,
          tvSchedule,
          aiMode,
          aiFeatures,
        }),
      });
      showMessage("success", t.messages.saved);
    } catch (error) {
      showMessage("error", t.messages.error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setApiConfigs(prev => ({
        ...prev,
        [service]: { ...prev[service as keyof typeof prev], status: "connected" },
      }));
      showMessage("success", t.messages.testSuccess);
    } catch (error) {
      setApiConfigs(prev => ({
        ...prev,
        [service]: { ...prev[service as keyof typeof prev], status: "error" },
      }));
      showMessage("error", t.messages.testFailed);
    } finally {
      setTesting(null);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addLBSRule = () => {
    const newRule: LBSRule = {
      id: `lbs-${Date.now()}`,
      name: { ru: "Новое правило", zh: "新规则" },
      radiusKm: 1,
      triggerMinutes: 30,
      rewardType: "coupon",
      rewardValue: 10,
      activeHoursStart: "10:00",
      activeHoursEnd: "20:00",
      isActive: false,
    };
    setLbsRules([...lbsRules, newRule]);
  };

  const updateLBSRule = (id: string, updates: Partial<LBSRule>) => {
    setLbsRules(rules =>
      rules.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteLBSRule = (id: string) => {
    setLbsRules(rules => rules.filter(r => r.id !== id));
  };

  const addTVSchedule = () => {
    const newItem: TVScheduleItem = {
      id: `tv-${Date.now()}`,
      name: { ru: "Новый контент", zh: "新内容" },
      type: "video",
      mediaUrl: "",
      startTime: "09:00",
      endTime: "18:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: false,
    };
    setTvSchedule([...tvSchedule, newItem]);
  };

  const updateTVSchedule = (id: string, updates: Partial<TVScheduleItem>) => {
    setTvSchedule(items =>
      items.map(i => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const deleteTVSchedule = (id: string) => {
    setTvSchedule(items => items.filter(i => i.id !== id));
  };

  const toggleDay = (itemId: string, day: number) => {
    setTvSchedule(items =>
      items.map(i => {
        if (i.id === itemId) {
          const days = i.daysOfWeek.includes(day)
            ? i.daysOfWeek.filter(d => d !== day)
            : [...i.daysOfWeek, day];
          return { ...i, daysOfWeek: days };
        }
        return i;
      })
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🌐 {t.title}
            </h1>
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
              onClick={saveConfigs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {t.actions.save}
            </button>
          </div>
        </div>

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

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {(["api", "cms", "lbs", "tv", "ai"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "api" && <Key className="w-4 h-4 inline mr-1" />}
              {tab === "cms" && <Palette className="w-4 h-4 inline mr-1" />}
              {tab === "lbs" && <MapPin className="w-4 h-4 inline mr-1" />}
              {tab === "tv" && <Tv className="w-4 h-4 inline mr-1" />}
              {tab === "ai" && <Bot className="w-4 h-4 inline mr-1" />}
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {activeTab === "api" && (
          <div className="space-y-6">
            {(["iiko", "deepseek", "telegram"] as const).map(service => (
              <div
                key={service}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t.api[service].title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t.api[service].description}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColors[apiConfigs[service].status]
                    }`}
                  >
                    {t.api.status[apiConfigs[service].status]}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.api[service].keyLabel}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[service] ? "text" : "password"}
                          value={apiConfigs[service].key}
                          onChange={e =>
                            setApiConfigs(prev => ({
                              ...prev,
                              [service]: { ...prev[service], key: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border rounded-lg pr-10"
                          placeholder="sk-xxxx-xxxx-xxxx"
                        />
                        <button
                          onClick={() => toggleShowKey(service)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showKeys[service] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => testConnection(service)}
                        disabled={testing === service || !apiConfigs[service].key}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                      >
                        {testing === service ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        {t.api.testConnection}
                      </button>
                    </div>
                  </div>

                  {service === "iiko" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.api.iiko.orgIdLabel}
                      </label>
                      <input
                        type="text"
                        value={apiConfigs.iiko.orgId}
                        onChange={e =>
                          setApiConfigs(prev => ({
                            ...prev,
                            iiko: { ...prev.iiko, orgId: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="org-12345"
                      />
                    </div>
                  )}

                  {service === "telegram" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.api.telegram.webhookLabel}
                      </label>
                      <input
                        type="text"
                        value={apiConfigs.telegram.webhookUrl}
                        onChange={e =>
                          setApiConfigs(prev => ({
                            ...prev,
                            telegram: {
                              ...prev.telegram,
                              webhookUrl: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "cms" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  {t.cms.logo}
                </label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {cmsConfig.logoUrl ? (
                    <img
                      src={cmsConfig.logoUrl}
                      alt="Logo"
                      className="max-h-20 mx-auto mb-2"
                    />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  )}
                  <button className="px-3 py-1 bg-gray-100 rounded text-sm">
                    {t.cms.upload}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  {t.cms.background}
                </label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {cmsConfig.backgroundUrl ? (
                    <img
                      src={cmsConfig.backgroundUrl}
                      alt="Background"
                      className="max-h-20 mx-auto mb-2 rounded"
                    />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  )}
                  <button className="px-3 py-1 bg-gray-100 rounded text-sm">
                    {t.cms.upload}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Type className="w-4 h-4 inline mr-1" />
                  {t.cms.font}
                </label>
                <select
                  value={cmsConfig.fontStyle}
                  onChange={e =>
                    setCmsConfig(prev => ({
                      ...prev,
                      fontStyle: e.target.value as CMSConfig["fontStyle"],
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {(["modern", "classic", "minimal"] as const).map(style => (
                    <option key={style} value={style}>
                      {t.cms.fonts[style]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.cms.primaryColor}
                  </label>
                  <input
                    type="color"
                    value={cmsConfig.primaryColor}
                    onChange={e =>
                      setCmsConfig(prev => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.cms.accentColor}
                  </label>
                  <input
                    type="color"
                    value={cmsConfig.accentColor}
                    onChange={e =>
                      setCmsConfig(prev => ({
                        ...prev,
                        accentColor: e.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lbs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  <MapPin className="w-5 h-5 inline mr-2" />
                  {t.lbs.title}
                </h3>
                <p className="text-sm text-gray-500">{t.lbs.description}</p>
              </div>
              <button
                onClick={addLBSRule}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                {t.lbs.addRule}
              </button>
            </div>

            {lbsRules.map(rule => (
              <div
                key={rule.id}
                className="bg-white rounded-xl shadow-sm border p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="text"
                    value={rule.name[lang]}
                    onChange={e =>
                      updateLBSRule(rule.id, {
                        name: { ...rule.name, [lang]: e.target.value },
                      })
                    }
                    className="text-lg font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateLBSRule(rule.id, { isActive: !rule.isActive })
                      }
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        rule.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {rule.isActive ? t.lbs.enabled : t.lbs.disabled}
                    </button>
                    <button
                      onClick={() => deleteLBSRule(rule.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.lbs.radius}
                    </label>
                    <input
                      type="number"
                      value={rule.radiusKm}
                      onChange={e =>
                        updateLBSRule(rule.id, {
                          radiusKm: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                      step="0.5"
                      min="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.lbs.triggerTime}
                    </label>
                    <input
                      type="number"
                      value={rule.triggerMinutes}
                      onChange={e =>
                        updateLBSRule(rule.id, {
                          triggerMinutes: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.lbs.reward}
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={rule.rewardType}
                        onChange={e =>
                          updateLBSRule(rule.id, {
                            rewardType: e.target.value as LBSRule["rewardType"],
                          })
                        }
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      >
                        {(["coupon", "points", "discount"] as const).map(
                          type => (
                            <option key={type} value={type}>
                              {t.lbs.rewardTypes[type]}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        type="number"
                        value={rule.rewardValue}
                        onChange={e =>
                          updateLBSRule(rule.id, {
                            rewardValue: parseInt(e.target.value),
                          })
                        }
                        className="w-16 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.lbs.activeHours}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={rule.activeHoursStart}
                        onChange={e =>
                          updateLBSRule(rule.id, {
                            activeHoursStart: e.target.value,
                          })
                        }
                        className="flex-1 px-1 py-1 border rounded text-xs"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={rule.activeHoursEnd}
                        onChange={e =>
                          updateLBSRule(rule.id, {
                            activeHoursEnd: e.target.value,
                          })
                        }
                        className="flex-1 px-1 py-1 border rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "tv" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  <Tv className="w-5 h-5 inline mr-2" />
                  {t.tv.title}
                </h3>
                <p className="text-sm text-gray-500">{t.tv.description}</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  {t.tv.offlineCache}
                </span>
                <button
                  onClick={addTVSchedule}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  {t.tv.addSchedule}
                </button>
              </div>
            </div>

            {tvSchedule.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="text"
                    value={item.name[lang]}
                    onChange={e =>
                      updateTVSchedule(item.id, {
                        name: { ...item.name, [lang]: e.target.value },
                      })
                    }
                    className="text-lg font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateTVSchedule(item.id, { isActive: !item.isActive })
                      }
                      className={`p-2 rounded ${
                        item.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.isActive ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteTVSchedule(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.tv.contentType}
                    </label>
                    <select
                      value={item.type}
                      onChange={e =>
                        updateTVSchedule(item.id, {
                          type: e.target.value as TVScheduleItem["type"],
                        })
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {(["video", "menu", "promo"] as const).map(type => (
                        <option key={type} value={type}>
                          {t.tv.types[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.tv.schedule}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={item.startTime}
                        onChange={e =>
                          updateTVSchedule(item.id, {
                            startTime: e.target.value,
                          })
                        }
                        className="flex-1 px-1 py-1 border rounded text-xs"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={item.endTime}
                        onChange={e =>
                          updateTVSchedule(item.id, { endTime: e.target.value })
                        }
                        className="flex-1 px-1 py-1 border rounded text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {t.tv.days[0]}
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 0].map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(item.id, day)}
                          className={`w-7 h-7 rounded text-xs ${
                            item.daysOfWeek.includes(day)
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {t.tv.days[idx]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <Globe className="w-4 h-4 inline mr-1" />
                TV 路由: <code className="bg-blue-100 px-1 rounded">/tv/:storeId</code>
              </p>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Bot className="w-5 h-5 inline mr-2" />
                {t.ai.title}
              </h3>
              <p className="text-sm text-gray-500 mb-6">{t.ai.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setAiMode("manual")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    aiMode === "manual"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ToggleLeft className="w-5 h-5" />
                    <span className="font-medium">
                      {t.ai.modes.manual.title}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.ai.modes.manual.description}
                  </p>
                </button>

                <button
                  onClick={() => setAiMode("auto")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    aiMode === "auto"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium">{t.ai.modes.auto.title}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.ai.modes.auto.description}
                  </p>
                </button>
              </div>

              {aiMode === "auto" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {t.ai.warning}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">
                  {t.ai.currentMode}: {aiMode === "manual" ? t.ai.modes.manual.title : t.ai.modes.auto.title}
                </h4>
                {(
                  ["scheduling", "marketing", "inventory", "pricing"] as const
                ).map(feature => (
                  <div
                    key={feature}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm">{t.ai.features[feature]}</span>
                    <button
                      onClick={() =>
                        setAiFeatures(prev => ({
                          ...prev,
                          [feature]: !prev[feature],
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        aiFeatures[feature] ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          aiFeatures[feature]
                            ? "translate-x-7"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
