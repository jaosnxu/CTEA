/**
 * CHUTEA 智慧中台 - 多租户管理
 *
 * 功能：
 * 1. 组织架构展示
 * 2. 门店管理
 * 3. 租户切换
 * 4. 数据隔离演示
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ==================== 类型定义 ====================

interface Organization {
  id: number;
  parentId: number | null;
  code: string;
  name: { ru: string; zh: string };
  level: "HQ" | "ORG" | "STORE";
  timezone: string;
  currency: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface Store {
  id: number;
  orgId: number;
  code: string;
  name: { ru: string; zh: string };
  address: { ru: string; zh: string };
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface TenantContext {
  orgId: number | null;
  storeId: number | null;
  orgName: { ru: string; zh: string };
  storeName: { ru: string; zh: string } | null;
  level: "HQ" | "ORG" | "STORE";
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление организациями",
    subtitle: "Мультитенантная архитектура",
    currentContext: "Текущий контекст",
    organizations: "Организации",
    stores: "Магазины",
    switchTo: "Переключить",
    hq: "Штаб-квартира",
    region: "Регион",
    store: "Магазин",
    active: "Активен",
    inactive: "Неактивен",
    stats: {
      totalOrgs: "Всего организаций",
      totalStores: "Всего магазинов",
      activeStores: "Активных магазинов",
    },
    columns: {
      code: "Код",
      name: "Название",
      level: "Уровень",
      status: "Статус",
      actions: "Действия",
      address: "Адрес",
      phone: "Телефон",
    },
    switchSuccess: "Контекст успешно переключен",
    dataIsolation: "Изоляция данных",
    dataIsolationDesc: "Все данные фильтруются по текущему контексту",
  },
  zh: {
    title: "组织管理",
    subtitle: "多租户架构",
    currentContext: "当前上下文",
    organizations: "组织架构",
    stores: "门店列表",
    switchTo: "切换",
    hq: "总部",
    region: "大区",
    store: "门店",
    active: "启用",
    inactive: "停用",
    stats: {
      totalOrgs: "总组织数",
      totalStores: "总门店数",
      activeStores: "营业门店",
    },
    columns: {
      code: "编码",
      name: "名称",
      level: "层级",
      status: "状态",
      actions: "操作",
      address: "地址",
      phone: "电话",
    },
    switchSuccess: "上下文切换成功",
    dataIsolation: "数据隔离",
    dataIsolationDesc: "所有数据按当前上下文过滤",
  },
};

// ==================== 主页面组件 ====================

export default function TenantManagementPage() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [activeTab, setActiveTab] = useState<"orgs" | "stores">("orgs");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [currentContext, setCurrentContext] = useState<TenantContext | null>(
    null
  );
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载组织
      const orgRes = await fetch("/api/tenant/organizations");
      const orgData = await orgRes.json();
      if (orgData.success) {
        setOrganizations(orgData.data);
      }

      // 加载门店
      const storeRes = await fetch("/api/tenant/stores");
      const storeData = await storeRes.json();
      if (storeData.success) {
        setStores(storeData.data);
      }

      // 加载当前上下文
      const contextRes = await fetch("/api/tenant/context");
      const contextData = await contextRes.json();
      if (contextData.success) {
        setCurrentContext(contextData.data);
      }

      // 加载统计
      const statsRes = await fetch("/api/tenant/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 切换租户
  const switchTenant = async (orgId: number | null, storeId: number | null) => {
    try {
      const response = await fetch("/api/tenant/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, storeId }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentContext(data.data.context);
        setMessage({ type: "success", text: data.data.message[lang] });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Error" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to switch tenant" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "HQ":
        return t.hq;
      case "ORG":
        return t.region;
      case "STORE":
        return t.store;
      default:
        return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "HQ":
        return "bg-purple-100 text-purple-700";
      case "ORG":
        return "bg-blue-100 text-blue-700";
      case "STORE":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
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
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {/* 当前上下文 */}
        {currentContext && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-80">{t.currentContext}</div>
                <div className="text-xl font-bold mt-1">
                  {currentContext.storeName?.[lang] ||
                    currentContext.orgName[lang]}
                </div>
                <div className="text-sm opacity-80 mt-1">
                  {getLevelLabel(currentContext.level)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">{t.dataIsolation}</div>
                <div className="text-sm mt-1">🔒 {t.dataIsolationDesc}</div>
              </div>
            </div>
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">
                {stats.organizations?.total || 0}
              </div>
              <div className="text-sm text-gray-500">{t.stats.totalOrgs}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">
                {stats.stores?.total || 0}
              </div>
              <div className="text-sm text-gray-500">{t.stats.totalStores}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {stats.stores?.active || 0}
              </div>
              <div className="text-sm text-gray-500">
                {t.stats.activeStores}
              </div>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("orgs")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "orgs"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.organizations}
          </button>
          <button
            onClick={() => setActiveTab("stores")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "stores"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.stores}
          </button>
        </div>

        {/* 组织列表 */}
        {activeTab === "orgs" && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.columns.code}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.columns.name}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.level}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.status}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {lang === "ru" ? "Загрузка..." : "加载中..."}
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {lang === "ru" ? "Нет данных" : "暂无数据"}
                    </td>
                  </tr>
                ) : (
                  organizations.map(org => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {org.code}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {typeof org.name === "object"
                          ? org.name[lang]
                          : org.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(org.level)}`}
                        >
                          {getLevelLabel(org.level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            org.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {org.status === "ACTIVE" ? t.active : t.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => switchTenant(org.id, null)}
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200"
                        >
                          {t.switchTo}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 门店列表 */}
        {activeTab === "stores" && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.columns.code}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.columns.name}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    {t.columns.address}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.phone}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.status}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    {t.columns.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {lang === "ru" ? "Загрузка..." : "加载中..."}
                    </td>
                  </tr>
                ) : stores.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {lang === "ru" ? "Нет данных" : "暂无数据"}
                    </td>
                  </tr>
                ) : (
                  stores.map(store => (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {store.code}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {typeof store.name === "object"
                          ? store.name[lang]
                          : store.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {typeof store.address === "object"
                          ? store.address[lang]
                          : store.address}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {store.phone}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            store.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {store.status === "ACTIVE" ? t.active : t.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => switchTenant(store.orgId, store.id)}
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200"
                        >
                          {t.switchTo}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
