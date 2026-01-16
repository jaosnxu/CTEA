/**
 * Pricing Rules List Page
 * /admin/pricing-rules
 *
 * Features:
 * - List all pricing rules with pagination
 * - Filter by active status and search
 * - Sort by priority, name, or update time
 * - Create, edit, and delete rules
 * - View affected products
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, type Language } from "../../lib/i18n";

interface PricingRule {
  id: string;
  name: { zh?: string; ru?: string; en?: string } | string;
  description: { zh?: string; ru?: string; en?: string } | string;
  condition: any;
  action: {
    type:
      | "DISCOUNT_PERCENT"
      | "DISCOUNT_FIXED"
      | "MARKUP_PERCENT"
      | "SET_PRICE";
    value: number;
  };
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const PricingRulesList: React.FC = () => {
  const [, navigate] = useLocation();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [language] = useState<Language>("ru"); // Can be connected to global language context

  // Filters and pagination
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 20;

  // Load pricing rules
  useEffect(() => {
    loadRules();
  }, [page, search, isActiveFilter]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        sortBy: "priority",
        sortOrder: "desc",
      });

      if (search) params.append("search", search);
      if (isActiveFilter !== undefined)
        params.append("isActive", isActiveFilter.toString());

      const response = await fetch(`/api/admin/pricing-rules?${params}`);
      const data = await response.json();

      if (data.success) {
        setRules(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to load pricing rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm(t("confirmDelete", language))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/pricing-rules/${ruleId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        loadRules();
      }
    } catch (error) {
      console.error("Failed to delete pricing rule:", error);
    }
  };

  const getName = (name: any): string => {
    if (typeof name === "string") return name;
    if (
      name &&
      typeof name === "object" &&
      language in name &&
      typeof name[language as keyof typeof name] === "string"
    ) {
      return name[language as keyof typeof name];
    }
    return name?.zh || name?.ru || name?.en || "";
  };

  const getDescription = (description: any): string => {
    if (typeof description === "string") return description;
    return (
      description?.[language] ||
      description?.zh ||
      description?.ru ||
      description?.en ||
      ""
    );
  };

  const getActionTypeLabel = (type: string): string => {
    const labels = {
      DISCOUNT_PERCENT: { ru: "Скидка %", zh: "百分比折扣", en: "Discount %" },
      DISCOUNT_FIXED: { ru: "Скидка ₽", zh: "固定折扣", en: "Fixed Discount" },
      MARKUP_PERCENT: { ru: "Наценка %", zh: "百分比加价", en: "Markup %" },
      SET_PRICE: { ru: "Фикс. цена", zh: "固定价格", en: "Set Price" },
    };
    const labelObj = labels[type as keyof typeof labels];
    return labelObj?.[language as keyof typeof labelObj] || type;
  };

  const getConditionSummary = (condition: any): string => {
    const parts: string[] = [];

    if (condition.userLevel) {
      parts.push(`${t("userLevel", language)}: ${condition.userLevel}`);
    }
    if (condition.hour && condition.hour.length > 0) {
      parts.push(`${t("hours", language)}: ${condition.hour.join(", ")}`);
    }
    if (condition.dayOfWeek && condition.dayOfWeek.length > 0) {
      const days = condition.dayOfWeek
        .map((d: number) => ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d])
        .join(", ");
      parts.push(`${t("days", language)}: ${days}`);
    }
    if (condition.storeId) {
      parts.push(`${t("store", language)}: ${condition.storeId}`);
    }
    if (condition.minQuantity) {
      parts.push(`${t("minQty", language)}: ${condition.minQuantity}`);
    }

    return parts.length > 0 ? parts.join(" • ") : t("noConditions", language);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("pricingRules", language)}
            </h1>
            <p className="text-gray-500 mt-1">
              {t("pricingRulesDescription", language)}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/pricing-rules/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("createRule", language)}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder", language)}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={
                isActiveFilter === undefined ? "all" : isActiveFilter.toString()
              }
              onChange={e => {
                const val = e.target.value;
                setIsActiveFilter(val === "all" ? undefined : val === "true");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t("allRules", language)}</option>
              <option value="true">{t("activeRules", language)}</option>
              <option value="false">{t("inactiveRules", language)}</option>
            </select>
          </div>
        </div>

        {/* Rules List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              {t("loading", language)}...
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {t("noRulesFound", language)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("name", language)}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("conditions", language)}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("action", language)}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("priority", language)}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("status", language)}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("actions", language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {getName(rule.name)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {getDescription(rule.description)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getConditionSummary(rule.condition)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {getActionTypeLabel(rule.action.type)}{" "}
                          {rule.action.value}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {rule.priority}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.isActive
                            ? t("active", language)
                            : t("inactive", language)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() =>
                            navigate(`/admin/pricing-rules/edit/${rule.id}`)
                          }
                          className="inline-flex items-center p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title={t("edit", language)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded"
                          title={t("delete", language)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t("page", language)} {page} {t("of", language)} {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Translation helper
const t = (key: string, lang: Language): string => {
  const translations: Record<string, Record<Language, string>> = {
    pricingRules: {
      ru: "Правила ценообразования",
      zh: "定价规则",
      en: "Pricing Rules",
    },
    pricingRulesDescription: {
      ru: "Управление динамическими правилами ценообразования",
      zh: "管理动态定价规则",
      en: "Manage dynamic pricing rules",
    },
    createRule: {
      ru: "Создать правило",
      zh: "创建规则",
      en: "Create Rule",
    },
    searchPlaceholder: {
      ru: "Поиск по названию или описанию...",
      zh: "搜索名称或描述...",
      en: "Search by name or description...",
    },
    allRules: {
      ru: "Все правила",
      zh: "所有规则",
      en: "All Rules",
    },
    activeRules: {
      ru: "Активные правила",
      zh: "启用的规则",
      en: "Active Rules",
    },
    inactiveRules: {
      ru: "Неактивные правила",
      zh: "禁用的规则",
      en: "Inactive Rules",
    },
    loading: {
      ru: "Загрузка",
      zh: "加载中",
      en: "Loading",
    },
    noRulesFound: {
      ru: "Правила не найдены",
      zh: "未找到规则",
      en: "No rules found",
    },
    name: {
      ru: "Название",
      zh: "名称",
      en: "Name",
    },
    conditions: {
      ru: "Условия",
      zh: "条件",
      en: "Conditions",
    },
    action: {
      ru: "Действие",
      zh: "动作",
      en: "Action",
    },
    priority: {
      ru: "Приоритет",
      zh: "优先级",
      en: "Priority",
    },
    status: {
      ru: "Статус",
      zh: "状态",
      en: "Status",
    },
    actions: {
      ru: "Действия",
      zh: "操作",
      en: "Actions",
    },
    active: {
      ru: "Активно",
      zh: "启用",
      en: "Active",
    },
    inactive: {
      ru: "Неактивно",
      zh: "禁用",
      en: "Inactive",
    },
    edit: {
      ru: "Редактировать",
      zh: "编辑",
      en: "Edit",
    },
    delete: {
      ru: "Удалить",
      zh: "删除",
      en: "Delete",
    },
    confirmDelete: {
      ru: "Вы уверены, что хотите удалить это правило?",
      zh: "确定要删除此规则吗？",
      en: "Are you sure you want to delete this rule?",
    },
    page: {
      ru: "Страница",
      zh: "页",
      en: "Page",
    },
    of: {
      ru: "из",
      zh: "共",
      en: "of",
    },
    userLevel: {
      ru: "Уровень пользователя",
      zh: "用户等级",
      en: "User Level",
    },
    hours: {
      ru: "Часы",
      zh: "时间",
      en: "Hours",
    },
    days: {
      ru: "Дни",
      zh: "星期",
      en: "Days",
    },
    store: {
      ru: "Магазин",
      zh: "门店",
      en: "Store",
    },
    minQty: {
      ru: "Мин. кол-во",
      zh: "最小数量",
      en: "Min Qty",
    },
    noConditions: {
      ru: "Нет условий",
      zh: "无条件",
      en: "No conditions",
    },
  };

  return translations[key]?.[lang] || key;
};

export default PricingRulesList;
