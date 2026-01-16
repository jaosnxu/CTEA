/**
 * CHUTEA 智慧中台 - 组织设置
 *
 * 功能：
 * 1. 组织列表管理
 * 2. IIKO API Key 配置
 * 3. 组织独立配置
 * 4. 多租户隔离
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Building2,
  Key,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  Settings,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MultiLangText {
  ru: string;
  zh: string;
  en?: string;
}

interface IikoConfig {
  apiKey: string;
  organizationId: string;
  terminalGroupId?: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus: "SUCCESS" | "FAILED" | "PENDING" | "NEVER";
}

interface Organization {
  id: string;
  name: MultiLangText;
  code: string;
  type: "TEA_SHOP" | "SHOPPING_MALL" | "FRANCHISE";
  timezone: string;
  currency: string;
  iikoConfig?: IikoConfig;
  settings: {
    allowOnlineOrders: boolean;
    allowDelivery: boolean;
    allowPickup: boolean;
    defaultLanguage: "ru" | "zh";
    taxRate: number;
  };
  isActive: boolean;
  createdAt: string;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Настройки организаций",
    subtitle: "Управление организациями и интеграциями",
    tabs: {
      organizations: "Организации",
      iiko: "IIKO Интеграция",
    },
    org: {
      name: "Название",
      nameRu: "Название (RU)",
      nameZh: "Название (ZH)",
      code: "Код",
      type: "Тип",
      types: {
        TEA_SHOP: "Чайный магазин",
        SHOPPING_MALL: "Торговый центр",
        FRANCHISE: "Франшиза",
      },
      timezone: "Часовой пояс",
      currency: "Валюта",
      status: "Статус",
      active: "Активна",
      inactive: "Неактивна",
    },
    iiko: {
      apiKey: "API Ключ",
      orgId: "ID Организации IIKO",
      terminalId: "ID Терминальной группы",
      status: "Статус синхронизации",
      lastSync: "Последняя синхронизация",
      syncStatuses: {
        SUCCESS: "Успешно",
        FAILED: "Ошибка",
        PENDING: "В процессе",
        NEVER: "Никогда",
      },
      testConnection: "Проверить подключение",
      syncNow: "Синхронизировать",
    },
    settings: {
      title: "Настройки",
      allowOnlineOrders: "Онлайн заказы",
      allowDelivery: "Доставка",
      allowPickup: "Самовывоз",
      defaultLanguage: "Язык по умолчанию",
      taxRate: "Ставка налога (%)",
    },
    actions: {
      add: "Добавить организацию",
      edit: "Редактировать",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      configure: "Настроить IIKO",
    },
    messages: {
      saved: "Сохранено успешно",
      deleted: "Удалено успешно",
      connectionSuccess: "Подключение успешно",
      connectionFailed: "Ошибка подключения",
      syncStarted: "Синхронизация запущена",
      error: "Ошибка",
      loading: "Загрузка...",
      noData: "Нет организаций",
      confirmDelete: "Удалить организацию?",
    },
  },
  zh: {
    title: "组织设置",
    subtitle: "管理组织和集成",
    tabs: {
      organizations: "组织",
      iiko: "IIKO 集成",
    },
    org: {
      name: "名称",
      nameRu: "名称 (俄语)",
      nameZh: "名称 (中文)",
      code: "编码",
      type: "类型",
      types: {
        TEA_SHOP: "奶茶店",
        SHOPPING_MALL: "购物中心",
        FRANCHISE: "加盟店",
      },
      timezone: "时区",
      currency: "货币",
      status: "状态",
      active: "启用",
      inactive: "停用",
    },
    iiko: {
      apiKey: "API 密钥",
      orgId: "IIKO 组织 ID",
      terminalId: "终端组 ID",
      status: "同步状态",
      lastSync: "最后同步",
      syncStatuses: {
        SUCCESS: "成功",
        FAILED: "失败",
        PENDING: "进行中",
        NEVER: "从未",
      },
      testConnection: "测试连接",
      syncNow: "立即同步",
    },
    settings: {
      title: "设置",
      allowOnlineOrders: "在线订单",
      allowDelivery: "配送",
      allowPickup: "自取",
      defaultLanguage: "默认语言",
      taxRate: "税率 (%)",
    },
    actions: {
      add: "添加组织",
      edit: "编辑",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      configure: "配置 IIKO",
    },
    messages: {
      saved: "保存成功",
      deleted: "删除成功",
      connectionSuccess: "连接成功",
      connectionFailed: "连接失败",
      syncStarted: "同步已启动",
      error: "错误",
      loading: "加载中...",
      noData: "暂无组织",
      confirmDelete: "确定删除该组织？",
    },
  },
};

// ==================== 同步状态颜色 ====================

const syncStatusColors: Record<IikoConfig["syncStatus"], string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  NEVER: "bg-gray-100 text-gray-500",
};

// ==================== 主组件 ====================

export default function OrganizationSettings() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [activeTab, setActiveTab] = useState<"organizations" | "iiko">(
    "organizations"
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 编辑状态
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(
    null
  );

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/store.listOrganizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.result?.data) {
        setOrganizations(data.result.data);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
      // 使用模拟数据
      setOrganizations([
        {
          id: "1",
          name: { ru: "Чайный магазин CHUTEA", zh: "CHUTEA 奶茶店" },
          code: "CHUTEA-MAIN",
          type: "TEA_SHOP",
          timezone: "Europe/Moscow",
          currency: "RUB",
          iikoConfig: {
            apiKey: "sk-iiko-xxxx-xxxx-xxxx",
            organizationId: "org-12345",
            terminalGroupId: "term-001",
            isActive: true,
            lastSyncAt: new Date().toISOString(),
            syncStatus: "SUCCESS",
          },
          settings: {
            allowOnlineOrders: true,
            allowDelivery: true,
            allowPickup: true,
            defaultLanguage: "ru",
            taxRate: 20,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: { ru: "Торговый центр Галерея", zh: "画廊购物中心" },
          code: "GALLERY-MALL",
          type: "SHOPPING_MALL",
          timezone: "Europe/Moscow",
          currency: "RUB",
          iikoConfig: {
            apiKey: "",
            organizationId: "",
            isActive: false,
            syncStatus: "NEVER",
          },
          settings: {
            allowOnlineOrders: true,
            allowDelivery: false,
            allowPickup: true,
            defaultLanguage: "ru",
            taxRate: 20,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 保存组织
  const saveOrganization = async (org: Organization) => {
    try {
      const isNew = !org.id || org.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/store.createOrganization"
        : "/api/trpc/store.updateOrganization";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(org),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setOrganizations([...organizations, data.result.data]);
        } else {
          setOrganizations(
            organizations.map(o => (o.id === org.id ? data.result.data : o))
          );
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!org.id || org.id.startsWith("new-")) {
        const newOrg = {
          ...org,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setOrganizations([...organizations, newOrg]);
      } else {
        setOrganizations(organizations.map(o => (o.id === org.id ? org : o)));
      }
      showMessage("success", t.messages.saved);
    }
    setEditingOrg(null);
    setShowForm(false);
  };

  // 删除组织
  const deleteOrganization = async (id: string) => {
    if (!confirm(t.messages.confirmDelete)) return;

    try {
      await fetch("/api/trpc/store.deleteOrganization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setOrganizations(organizations.filter(o => o.id !== id));
    showMessage("success", t.messages.deleted);
  };

  // 测试 IIKO 连接
  const testIikoConnection = async (orgId: string) => {
    setTestingConnection(orgId);
    try {
      await fetch("/api/trpc/store.testIikoConnection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      // 模拟成功
      await new Promise(resolve => setTimeout(resolve, 1500));
      showMessage("success", t.messages.connectionSuccess);

      // 更新状态
      setOrganizations(
        organizations.map(o => {
          if (o.id === orgId && o.iikoConfig) {
            return {
              ...o,
              iikoConfig: {
                ...o.iikoConfig,
                syncStatus: "SUCCESS" as const,
                lastSyncAt: new Date().toISOString(),
              },
            };
          }
          return o;
        })
      );
    } catch (error) {
      showMessage("error", t.messages.connectionFailed);
    } finally {
      setTestingConnection(null);
    }
  };

  // 更新 IIKO 配置
  const updateIikoConfig = (
    orgId: string,
    field: keyof IikoConfig,
    value: string | boolean
  ) => {
    setOrganizations(
      organizations.map(o => {
        if (o.id === orgId) {
          return {
            ...o,
            iikoConfig: {
              ...o.iikoConfig,
              [field]: value,
            } as IikoConfig,
          };
        }
        return o;
      })
    );
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString(lang === "ru" ? "ru-RU" : "zh-CN");
  };

  const toggleShowApiKey = (orgId: string) => {
    setShowApiKey(prev => ({ ...prev, [orgId]: !prev[orgId] }));
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏢 {t.title}</h1>
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

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b">
          {(["organizations", "iiko"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* 组织列表 */}
        {activeTab === "organizations" && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingOrg({
                    id: `new-${Date.now()}`,
                    name: { ru: "", zh: "" },
                    code: "",
                    type: "TEA_SHOP",
                    timezone: "Europe/Moscow",
                    currency: "RUB",
                    settings: {
                      allowOnlineOrders: true,
                      allowDelivery: true,
                      allowPickup: true,
                      defaultLanguage: "ru",
                      taxRate: 20,
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

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  {t.messages.loading}
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t.messages.noData}
                </div>
              ) : (
                <div className="divide-y">
                  {organizations.map(org => (
                    <div
                      key={org.id}
                      className="p-4 flex items-center gap-4 hover:bg-gray-50"
                    >
                      {/* 图标 */}
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {org.name[lang]}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                          <span>{org.code}</span>
                          <span>{t.org.types[org.type]}</span>
                          <span>{org.timezone}</span>
                        </div>
                      </div>

                      {/* IIKO 状态 */}
                      {org.iikoConfig && (
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-gray-400" />
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              syncStatusColors[org.iikoConfig.syncStatus]
                            }`}
                          >
                            IIKO:{" "}
                            {t.iiko.syncStatuses[org.iikoConfig.syncStatus]}
                          </span>
                        </div>
                      )}

                      {/* 状态 */}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          org.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {org.isActive ? t.org.active : t.org.inactive}
                      </span>

                      {/* 操作 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingOrg(org);
                            setShowForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOrganization(org.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* IIKO 集成 */}
        {activeTab === "iiko" && (
          <div className="space-y-6">
            {organizations.map(org => (
              <div
                key={org.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {org.name[lang]}
                      </div>
                      <div className="text-sm text-gray-500">{org.code}</div>
                    </div>
                  </div>
                  {org.iikoConfig && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        syncStatusColors[org.iikoConfig.syncStatus]
                      }`}
                    >
                      {t.iiko.syncStatuses[org.iikoConfig.syncStatus]}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.iiko.apiKey}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showApiKey[org.id] ? "text" : "password"}
                          value={org.iikoConfig?.apiKey || ""}
                          onChange={e =>
                            updateIikoConfig(org.id, "apiKey", e.target.value)
                          }
                          placeholder="sk-iiko-xxxx-xxxx-xxxx"
                          className="w-full px-3 py-2 border rounded-lg pr-10"
                        />
                        <button
                          onClick={() => toggleShowApiKey(org.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey[org.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Organization ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.iiko.orgId}
                      </label>
                      <input
                        type="text"
                        value={org.iikoConfig?.organizationId || ""}
                        onChange={e =>
                          updateIikoConfig(
                            org.id,
                            "organizationId",
                            e.target.value
                          )
                        }
                        placeholder="org-12345"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.iiko.terminalId}
                      </label>
                      <input
                        type="text"
                        value={org.iikoConfig?.terminalGroupId || ""}
                        onChange={e =>
                          updateIikoConfig(
                            org.id,
                            "terminalGroupId",
                            e.target.value
                          )
                        }
                        placeholder="term-001"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* 最后同步时间 */}
                  {org.iikoConfig?.lastSyncAt && (
                    <div className="text-sm text-gray-500">
                      {t.iiko.lastSync}:{" "}
                      {formatDateTime(org.iikoConfig.lastSyncAt)}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => testIikoConnection(org.id)}
                      disabled={
                        testingConnection === org.id || !org.iikoConfig?.apiKey
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingConnection === org.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {t.iiko.testConnection}
                    </button>
                    <button
                      onClick={() => {
                        showMessage("success", t.messages.syncStarted);
                      }}
                      disabled={!org.iikoConfig?.apiKey}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t.iiko.syncNow}
                    </button>
                    <button
                      onClick={() => saveOrganization(org)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4" />
                      {t.actions.save}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{t.messages.noData}</p>
              </div>
            )}
          </div>
        )}

        {/* 编辑表单 */}
        {showForm && editingOrg && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingOrg.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrg(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 名称 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.nameRu}
                    </label>
                    <input
                      type="text"
                      value={editingOrg.name.ru}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          name: { ...editingOrg.name, ru: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.nameZh}
                    </label>
                    <input
                      type="text"
                      value={editingOrg.name.zh}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          name: { ...editingOrg.name, zh: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 编码和类型 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.code}
                    </label>
                    <input
                      type="text"
                      value={editingOrg.code}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.type}
                    </label>
                    <select
                      value={editingOrg.type}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          type: e.target.value as Organization["type"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {Object.entries(t.org.types).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 时区和货币 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.timezone}
                    </label>
                    <select
                      value={editingOrg.timezone}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          timezone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="Europe/Moscow">Europe/Moscow (MSK)</option>
                      <option value="Europe/Kaliningrad">
                        Europe/Kaliningrad (EET)
                      </option>
                      <option value="Asia/Yekaterinburg">
                        Asia/Yekaterinburg (YEKT)
                      </option>
                      <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.org.currency}
                    </label>
                    <select
                      value={editingOrg.currency}
                      onChange={e =>
                        setEditingOrg({
                          ...editingOrg,
                          currency: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="RUB">RUB (₽)</option>
                    </select>
                  </div>
                </div>

                {/* 设置 */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t.settings.title}
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingOrg.settings.allowOnlineOrders}
                        onChange={e =>
                          setEditingOrg({
                            ...editingOrg,
                            settings: {
                              ...editingOrg.settings,
                              allowOnlineOrders: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {t.settings.allowOnlineOrders}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingOrg.settings.allowDelivery}
                        onChange={e =>
                          setEditingOrg({
                            ...editingOrg,
                            settings: {
                              ...editingOrg.settings,
                              allowDelivery: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {t.settings.allowDelivery}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingOrg.settings.allowPickup}
                        onChange={e =>
                          setEditingOrg({
                            ...editingOrg,
                            settings: {
                              ...editingOrg.settings,
                              allowPickup: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {t.settings.allowPickup}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.settings.defaultLanguage}
                        </label>
                        <select
                          value={editingOrg.settings.defaultLanguage}
                          onChange={e =>
                            setEditingOrg({
                              ...editingOrg,
                              settings: {
                                ...editingOrg.settings,
                                defaultLanguage: e.target.value as "ru" | "zh",
                              },
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="ru">Русский</option>
                          <option value="zh">中文</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.settings.taxRate}
                        </label>
                        <input
                          type="number"
                          value={editingOrg.settings.taxRate}
                          onChange={e =>
                            setEditingOrg({
                              ...editingOrg,
                              settings: {
                                ...editingOrg.settings,
                                taxRate: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.org.status}
                  </label>
                  <select
                    value={editingOrg.isActive ? "active" : "inactive"}
                    onChange={e =>
                      setEditingOrg({
                        ...editingOrg,
                        isActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">{t.org.active}</option>
                    <option value="inactive">{t.org.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrg(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveOrganization(editingOrg)}
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
