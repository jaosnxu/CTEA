/**
 * Pricing Rule Form/Editor
 * /admin/pricing-rules/new
 * /admin/pricing-rules/edit/:id
 *
 * Features:
 * - Create or edit pricing rules
 * - Multi-language name and description
 * - Visual condition builder
 * - Action editor with type selection
 * - Priority setting
 * - Active/inactive toggle
 */

import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Save, X, ArrowLeft } from "lucide-react";
import { type Language } from "../../lib/i18n";

interface PricingRuleFormData {
  name: {
    zh: string;
    ru: string;
    en: string;
  };
  description: {
    zh: string;
    ru: string;
    en: string;
  };
  condition: {
    userLevel?: string;
    hour?: number[];
    dayOfWeek?: number[];
    storeId?: string;
    minQuantity?: number;
  };
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
}

const defaultFormData: PricingRuleFormData = {
  name: { zh: "", ru: "", en: "" },
  description: { zh: "", ru: "", en: "" },
  condition: {},
  action: { type: "DISCOUNT_PERCENT", value: 0 },
  priority: 10,
  isActive: true,
};

const PricingRuleForm: React.FC = () => {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const [language] = useState<Language>("ru");

  const [formData, setFormData] =
    useState<PricingRuleFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing rule if editing
  useEffect(() => {
    if (isEdit && id) {
      loadRule(id);
    }
  }, [id, isEdit]);

  const loadRule = async (ruleId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pricing-rules/${ruleId}`);
      const data = await response.json();

      if (data.success) {
        const rule = data.data;
        setFormData({
          name:
            typeof rule.name === "string"
              ? { zh: rule.name, ru: rule.name, en: rule.name }
              : rule.name,
          description:
            typeof rule.description === "string"
              ? {
                  zh: rule.description,
                  ru: rule.description,
                  en: rule.description,
                }
              : rule.description || { zh: "", ru: "", en: "" },
          condition: rule.condition || {},
          action: rule.action,
          priority: rule.priority,
          isActive: rule.isActive,
        });
      }
    } catch (error) {
      console.error("Failed to load pricing rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.zh && !formData.name.ru && !formData.name.en) {
      newErrors.name = t("nameRequired", language);
    }

    if (formData.action.value <= 0) {
      newErrors.actionValue = t("valueRequired", language);
    }

    if (formData.priority < 0) {
      newErrors.priority = t("priorityInvalid", language);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const url = isEdit
        ? `/api/admin/pricing-rules/${id}`
        : "/api/admin/pricing-rules";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        navigate("/admin/pricing-rules");
      } else {
        alert(data.message || t("saveFailed", language));
      }
    } catch (error) {
      console.error("Failed to save pricing rule:", error);
      alert(t("saveFailed", language));
    } finally {
      setSaving(false);
    }
  };

  const updateCondition = (key: string, value: any) => {
    setFormData({
      ...formData,
      condition: {
        ...formData.condition,
        [key]: value,
      },
    });
  };

  const removeCondition = (key: string) => {
    const newCondition = { ...formData.condition };
    delete newCondition[key as keyof typeof newCondition];
    setFormData({ ...formData, condition: newCondition });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">{t("loading", language)}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/pricing-rules")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("back", language)}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? t("editRule", language) : t("createRule", language)}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t("basicInfo", language)}
            </h2>

            {/* Name (Multi-language) */}
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-gray-700">
                {t("name", language)} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">
                    中文 (Chinese)
                  </label>
                  <input
                    type="text"
                    value={formData.name.zh}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, zh: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Русский (Russian)
                  </label>
                  <input
                    type="text"
                    value={formData.name.ru}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, ru: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">English</label>
                  <input
                    type="text"
                    value={formData.name.en}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name, en: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description (Multi-language) */}
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-gray-700">
                {t("description", language)}
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">中文</label>
                  <textarea
                    value={formData.description.zh}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        description: {
                          ...formData.description,
                          zh: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Русский</label>
                  <textarea
                    value={formData.description.ru}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        description: {
                          ...formData.description,
                          ru: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">English</label>
                  <textarea
                    value={formData.description.en}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        description: {
                          ...formData.description,
                          en: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("priority", language)}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={e =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value) || 0,
                  })
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("priorityHelp", language)}
              </p>
              {errors.priority && (
                <p className="text-red-500 text-sm mt-1">{errors.priority}</p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isActive"
                className="ml-2 block text-sm text-gray-900"
              >
                {t("activeStatus", language)}
              </label>
            </div>
          </div>

          {/* Conditions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t("conditions", language)}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {t("conditionsHelp", language)}
            </p>

            <div className="space-y-4">
              {/* User Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("userLevel", language)}
                </label>
                <select
                  value={formData.condition.userLevel || ""}
                  onChange={e =>
                    updateCondition("userLevel", e.target.value || undefined)
                  }
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t("anyLevel", language)}</option>
                  <option value="REGULAR">{t("regular", language)}</option>
                  <option value="Silver">{t("silver", language)}</option>
                  <option value="Gold">{t("gold", language)}</option>
                  <option value="Platinum">{t("platinum", language)}</option>
                </select>
              </div>

              {/* Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("hours", language)}
                </label>
                <input
                  type="text"
                  placeholder="例如: 14,15,16,17"
                  value={formData.condition.hour?.join(",") || ""}
                  onChange={e => {
                    const value = e.target.value;
                    if (value) {
                      const hours = value
                        .split(",")
                        .map(h => parseInt(h.trim()))
                        .filter(h => !isNaN(h) && h >= 0 && h <= 23);
                      updateCondition(
                        "hour",
                        hours.length > 0 ? hours : undefined
                      );
                    } else {
                      updateCondition("hour", undefined);
                    }
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("hoursHelp", language)}
                </p>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("daysOfWeek", language)}
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
                    const isSelected =
                      formData.condition.dayOfWeek?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = formData.condition.dayOfWeek || [];
                          const updated = isSelected
                            ? current.filter(d => d !== day)
                            : [...current, day];
                          updateCondition(
                            "dayOfWeek",
                            updated.length > 0 ? updated : undefined
                          );
                        }}
                        className={`px-4 py-2 rounded ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {dayNames[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Min Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("minQuantity", language)}
                </label>
                <input
                  type="number"
                  value={formData.condition.minQuantity || ""}
                  onChange={e => {
                    const value = parseInt(e.target.value);
                    updateCondition(
                      "minQuantity",
                      value > 0 ? value : undefined
                    );
                  }}
                  placeholder="1"
                  min="1"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t("action", language)}
            </h2>

            <div className="space-y-4">
              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("actionType", language)}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.action.type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      action: {
                        ...formData.action,
                        type: e.target.value as any,
                      },
                    })
                  }
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="DISCOUNT_PERCENT">
                    {t("discountPercent", language)}
                  </option>
                  <option value="DISCOUNT_FIXED">
                    {t("discountFixed", language)}
                  </option>
                  <option value="MARKUP_PERCENT">
                    {t("markupPercent", language)}
                  </option>
                  <option value="SET_PRICE">{t("setPrice", language)}</option>
                </select>
              </div>

              {/* Action Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("value", language)} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.action.value}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      action: {
                        ...formData.action,
                        value: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  step="0.01"
                  min="0"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getActionValueHelp()}
                </p>
                {errors.actionValue && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.actionValue}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/pricing-rules")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 inline mr-2" />
              {t("cancel", language)}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5 inline mr-2" />
              {saving ? t("saving", language) : t("save", language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  function getActionValueHelp(): string {
    const type = formData.action.type;
    const helps = {
      DISCOUNT_PERCENT: t("discountPercentHelp", language),
      DISCOUNT_FIXED: t("discountFixedHelp", language),
      MARKUP_PERCENT: t("markupPercentHelp", language),
      SET_PRICE: t("setPriceHelp", language),
    };
    return helps[type] || "";
  }
};

// Translation helper
const t = (key: string, lang: Language): string => {
  const translations: Record<string, Record<Language, string>> = {
    loading: { ru: "Загрузка", zh: "加载中", en: "Loading" },
    back: { ru: "Назад", zh: "返回", en: "Back" },
    editRule: { ru: "Редактировать правило", zh: "编辑规则", en: "Edit Rule" },
    createRule: { ru: "Создать правило", zh: "创建规则", en: "Create Rule" },
    basicInfo: {
      ru: "Основная информация",
      zh: "基本信息",
      en: "Basic Information",
    },
    name: { ru: "Название", zh: "名称", en: "Name" },
    description: { ru: "Описание", zh: "描述", en: "Description" },
    priority: { ru: "Приоритет", zh: "优先级", en: "Priority" },
    priorityHelp: {
      ru: "Более высокий приоритет применяется первым",
      zh: "数字越大优先级越高",
      en: "Higher numbers are applied first",
    },
    activeStatus: {
      ru: "Активировать правило",
      zh: "启用规则",
      en: "Activate rule",
    },
    conditions: { ru: "Условия", zh: "条件", en: "Conditions" },
    conditionsHelp: {
      ru: "Правило будет применяться только при соблюдении этих условий",
      zh: "仅在满足这些条件时应用规则",
      en: "Rule will only apply when these conditions are met",
    },
    userLevel: { ru: "Уровень пользователя", zh: "用户等级", en: "User Level" },
    anyLevel: { ru: "Любой уровень", zh: "任何等级", en: "Any level" },
    regular: { ru: "Обычный", zh: "普通", en: "Regular" },
    silver: { ru: "Серебряный", zh: "银卡", en: "Silver" },
    gold: { ru: "Золотой", zh: "金卡", en: "Gold" },
    platinum: { ru: "Платиновый", zh: "白金", en: "Platinum" },
    hours: { ru: "Часы", zh: "时间段", en: "Hours" },
    hoursHelp: {
      ru: "Введите часы через запятую (0-23)",
      zh: "输入小时，用逗号分隔 (0-23)",
      en: "Enter hours separated by commas (0-23)",
    },
    daysOfWeek: { ru: "Дни недели", zh: "星期", en: "Days of Week" },
    minQuantity: {
      ru: "Минимальное количество",
      zh: "最小数量",
      en: "Minimum Quantity",
    },
    action: { ru: "Действие", zh: "动作", en: "Action" },
    actionType: { ru: "Тип действия", zh: "动作类型", en: "Action Type" },
    discountPercent: {
      ru: "Скидка в процентах",
      zh: "百分比折扣",
      en: "Discount Percent",
    },
    discountFixed: {
      ru: "Фиксированная скидка",
      zh: "固定金额折扣",
      en: "Fixed Discount",
    },
    markupPercent: {
      ru: "Наценка в процентах",
      zh: "百分比加价",
      en: "Markup Percent",
    },
    setPrice: { ru: "Установить цену", zh: "设置固定价格", en: "Set Price" },
    value: { ru: "Значение", zh: "数值", en: "Value" },
    discountPercentHelp: {
      ru: "Процент скидки (например, 20 = 20% скидка)",
      zh: "折扣百分比 (例如, 20 = 8折)",
      en: "Discount percentage (e.g., 20 = 20% off)",
    },
    discountFixedHelp: {
      ru: "Фиксированная сумма скидки в рублях",
      zh: "固定折扣金额（卢布）",
      en: "Fixed discount amount in rubles",
    },
    markupPercentHelp: {
      ru: "Процент наценки (например, 10 = +10%)",
      zh: "加价百分比 (例如, 10 = +10%)",
      en: "Markup percentage (e.g., 10 = +10%)",
    },
    setPriceHelp: {
      ru: "Установить фиксированную цену в рублях",
      zh: "设置固定价格（卢布）",
      en: "Set fixed price in rubles",
    },
    cancel: { ru: "Отмена", zh: "取消", en: "Cancel" },
    save: { ru: "Сохранить", zh: "保存", en: "Save" },
    saving: { ru: "Сохранение", zh: "保存中", en: "Saving" },
    nameRequired: {
      ru: "Необходимо указать название хотя бы на одном языке",
      zh: "至少需要一种语言的名称",
      en: "Name is required in at least one language",
    },
    valueRequired: {
      ru: "Значение должно быть больше 0",
      zh: "数值必须大于0",
      en: "Value must be greater than 0",
    },
    priorityInvalid: {
      ru: "Приоритет должен быть неотрицательным",
      zh: "优先级必须为非负数",
      en: "Priority must be non-negative",
    },
    saveFailed: {
      ru: "Не удалось сохранить правило",
      zh: "保存规则失败",
      en: "Failed to save rule",
    },
  };

  return translations[key]?.[lang] || key;
};

export default PricingRuleForm;
