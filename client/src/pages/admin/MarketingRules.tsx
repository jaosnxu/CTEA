/**
 * CHUTEA 智慧中台 - 营销规则管理
 *
 * 功能：
 * 1. 营销规则 CRUD
 * 2. 规则类型：买一送一、第二杯半价、满减等
 * 3. 审批流程管理
 * 4. 生效时间控制
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  Clock,
  AlertCircle,
  Gift,
  Percent,
  Tag,
  Calendar,
  Send,
  XCircle,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MultiLangText {
  ru: string;
  zh: string;
  en?: string;
}

type RuleType =
  | "BOGO"
  | "FIXED_DISCOUNT"
  | "PERCENTAGE_OFF"
  | "SECOND_HALF_PRICE"
  | "SPEND_GET"
  | "BIRTHDAY_COUPON"
  | "FREE_VOUCHER";

type ApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

interface MarketingRule {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  type: RuleType;
  config: {
    discountValue?: number;
    discountPercent?: number;
    minSpend?: number;
    maxDiscount?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
  };
  priority: number;
  isStackable: boolean;
  maxUsagePerUser?: number;
  totalUsageLimit?: number;
  currentUsage: number;
  status: ApprovalStatus;
  startTime?: string;
  endTime?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  createdBy: string;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Маркетинговые правила",
    subtitle: "Настройка акций и скидок",
    rule: {
      name: "Название",
      nameRu: "Название (RU)",
      nameZh: "Название (ZH)",
      description: "Описание",
      descRu: "Описание (RU)",
      descZh: "Описание (ZH)",
      type: "Тип правила",
      types: {
        BOGO: "Купи 1 получи 1",
        FIXED_DISCOUNT: "Фиксированная скидка",
        PERCENTAGE_OFF: "Процентная скидка",
        SECOND_HALF_PRICE: "2-й за полцены",
        SPEND_GET: "Потрать X получи Y",
        BIRTHDAY_COUPON: "Купон на день рождения",
        FREE_VOUCHER: "Бесплатный ваучер",
      },
      config: {
        discountValue: "Сумма скидки (₽)",
        discountPercent: "Процент скидки (%)",
        minSpend: "Мин. сумма заказа (₽)",
        maxDiscount: "Макс. скидка (₽)",
      },
      priority: "Приоритет",
      stackable: "Суммируется",
      maxUsage: "Макс. использований/пользователь",
      totalLimit: "Общий лимит",
      currentUsage: "Использовано",
      status: "Статус",
      statuses: {
        DRAFT: "Черновик",
        PENDING_APPROVAL: "На утверждении",
        APPROVED: "Утверждено",
        REJECTED: "Отклонено",
        ACTIVE: "Активно",
        EXPIRED: "Истекло",
        CANCELLED: "Отменено",
      },
      startTime: "Начало",
      endTime: "Конец",
      rejectionReason: "Причина отклонения",
    },
    actions: {
      add: "Создать правило",
      edit: "Редактировать",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      submit: "Отправить на утверждение",
      approve: "Утвердить",
      reject: "Отклонить",
      activate: "Активировать",
    },
    messages: {
      saved: "Сохранено успешно",
      deleted: "Удалено успешно",
      submitted: "Отправлено на утверждение",
      approved: "Правило утверждено",
      rejected: "Правило отклонено",
      error: "Ошибка",
      loading: "Загрузка...",
      noData: "Нет правил",
      confirmDelete: "Удалить правило?",
      enterReason: "Введите причину отклонения:",
    },
    filter: {
      all: "Все",
      draft: "Черновики",
      pending: "На утверждении",
      active: "Активные",
      expired: "Истекшие",
    },
  },
  zh: {
    title: "营销规则",
    subtitle: "配置活动和折扣",
    rule: {
      name: "名称",
      nameRu: "名称 (俄语)",
      nameZh: "名称 (中文)",
      description: "描述",
      descRu: "描述 (俄语)",
      descZh: "描述 (中文)",
      type: "规则类型",
      types: {
        BOGO: "买一送一",
        FIXED_DISCOUNT: "固定折扣",
        PERCENTAGE_OFF: "百分比折扣",
        SECOND_HALF_PRICE: "第二杯半价",
        SPEND_GET: "满X减Y",
        BIRTHDAY_COUPON: "生日券",
        FREE_VOUCHER: "免费券",
      },
      config: {
        discountValue: "折扣金额 (₽)",
        discountPercent: "折扣百分比 (%)",
        minSpend: "最低消费 (₽)",
        maxDiscount: "最高折扣 (₽)",
      },
      priority: "优先级",
      stackable: "可叠加",
      maxUsage: "每用户最大使用次数",
      totalLimit: "总使用限制",
      currentUsage: "已使用",
      status: "状态",
      statuses: {
        DRAFT: "草稿",
        PENDING_APPROVAL: "待审批",
        APPROVED: "已批准",
        REJECTED: "已拒绝",
        ACTIVE: "已激活",
        EXPIRED: "已过期",
        CANCELLED: "已取消",
      },
      startTime: "开始时间",
      endTime: "结束时间",
      rejectionReason: "拒绝原因",
    },
    actions: {
      add: "创建规则",
      edit: "编辑",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      submit: "提交审批",
      approve: "批准",
      reject: "拒绝",
      activate: "激活",
    },
    messages: {
      saved: "保存成功",
      deleted: "删除成功",
      submitted: "已提交审批",
      approved: "规则已批准",
      rejected: "规则已拒绝",
      error: "错误",
      loading: "加载中...",
      noData: "暂无规则",
      confirmDelete: "确定删除该规则？",
      enterReason: "请输入拒绝原因：",
    },
    filter: {
      all: "全部",
      draft: "草稿",
      pending: "待审批",
      active: "已激活",
      expired: "已过期",
    },
  },
};

// ==================== 状态颜色映射 ====================

const statusColors: Record<ApprovalStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const typeIcons: Record<RuleType, React.ReactNode> = {
  BOGO: <Gift className="w-4 h-4" />,
  FIXED_DISCOUNT: <Tag className="w-4 h-4" />,
  PERCENTAGE_OFF: <Percent className="w-4 h-4" />,
  SECOND_HALF_PRICE: <Tag className="w-4 h-4" />,
  SPEND_GET: <Gift className="w-4 h-4" />,
  BIRTHDAY_COUPON: <Gift className="w-4 h-4" />,
  FREE_VOUCHER: <Gift className="w-4 h-4" />,
};

// ==================== 主组件 ====================

export default function MarketingRules() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [rules, setRules] = useState<MarketingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [filter, setFilter] = useState<
    "all" | "draft" | "pending" | "active" | "expired"
  >("all");

  // 编辑状态
  const [editingRule, setEditingRule] = useState<MarketingRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/marketing.list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.result?.data) {
        setRules(data.result.data);
      }
    } catch (error) {
      console.error("Failed to load rules:", error);
      // 使用模拟数据
      setRules([
        {
          id: "1",
          name: { ru: "Купи 1 получи 1 бесплатно", zh: "买一送一" },
          description: {
            ru: "Купите любой напиток и получите второй бесплатно",
            zh: "购买任意饮品，第二杯免费",
          },
          type: "BOGO",
          config: {},
          priority: 1,
          isStackable: false,
          currentUsage: 156,
          totalUsageLimit: 500,
          status: "ACTIVE",
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-31T23:59:59Z",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        },
        {
          id: "2",
          name: { ru: "Второй за полцены", zh: "第二杯半价" },
          description: {
            ru: "Второй напиток за 50% стоимости",
            zh: "第二杯享受半价优惠",
          },
          type: "SECOND_HALF_PRICE",
          config: { discountPercent: 50 },
          priority: 2,
          isStackable: false,
          currentUsage: 89,
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
          createdBy: "marketing",
        },
        {
          id: "3",
          name: { ru: "Скидка 50₽", zh: "立减50卢布" },
          description: {
            ru: "Скидка 50₽ при заказе от 300₽",
            zh: "订单满300卢布立减50卢布",
          },
          type: "SPEND_GET",
          config: { minSpend: 300, discountValue: 50 },
          priority: 3,
          isStackable: true,
          currentUsage: 0,
          status: "DRAFT",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 保存规则
  const saveRule = async (rule: MarketingRule) => {
    try {
      const isNew = !rule.id || rule.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/marketing.create"
        : "/api/trpc/marketing.update";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setRules([...rules, data.result.data]);
        } else {
          setRules(rules.map(r => (r.id === rule.id ? data.result.data : r)));
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!rule.id || rule.id.startsWith("new-")) {
        const newRule = {
          ...rule,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setRules([...rules, newRule]);
      } else {
        setRules(rules.map(r => (r.id === rule.id ? rule : r)));
      }
      showMessage("success", t.messages.saved);
    }
    setEditingRule(null);
    setShowForm(false);
  };

  // 删除规则
  const deleteRule = async (id: string) => {
    if (!confirm(t.messages.confirmDelete)) return;

    try {
      await fetch("/api/trpc/marketing.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setRules(rules.filter(r => r.id !== id));
    showMessage("success", t.messages.deleted);
  };

  // 提交审批
  const submitForApproval = (id: string) => {
    setRules(
      rules.map(r =>
        r.id === id ? { ...r, status: "PENDING_APPROVAL" as ApprovalStatus } : r
      )
    );
    showMessage("success", t.messages.submitted);
  };

  // 批准
  const approveRule = (id: string) => {
    setRules(
      rules.map(r =>
        r.id === id
          ? {
              ...r,
              status: "APPROVED" as ApprovalStatus,
              approvedBy: "admin",
              approvedAt: new Date().toISOString(),
            }
          : r
      )
    );
    showMessage("success", t.messages.approved);
  };

  // 拒绝
  const rejectRule = (id: string) => {
    const reason = prompt(t.messages.enterReason);
    if (!reason) return;

    setRules(
      rules.map(r =>
        r.id === id
          ? {
              ...r,
              status: "REJECTED" as ApprovalStatus,
              rejectionReason: reason,
            }
          : r
      )
    );
    showMessage("success", t.messages.rejected);
  };

  // 激活
  const activateRule = (id: string) => {
    setRules(
      rules.map(r =>
        r.id === id ? { ...r, status: "ACTIVE" as ApprovalStatus } : r
      )
    );
  };

  // 过滤规则
  const filteredRules = rules.filter(r => {
    switch (filter) {
      case "draft":
        return r.status === "DRAFT";
      case "pending":
        return r.status === "PENDING_APPROVAL";
      case "active":
        return r.status === "ACTIVE";
      case "expired":
        return r.status === "EXPIRED";
      default:
        return true;
    }
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString(lang === "ru" ? "ru-RU" : "zh-CN");
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 {t.title}</h1>
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

        {/* 工具栏 */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            {(["all", "draft", "pending", "active", "expired"] as const).map(
              f => (
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
              )
            )}
          </div>

          <button
            onClick={() => {
              setEditingRule({
                id: `new-${Date.now()}`,
                name: { ru: "", zh: "" },
                description: { ru: "", zh: "" },
                type: "BOGO",
                config: {},
                priority: rules.length + 1,
                isStackable: false,
                currentUsage: 0,
                status: "DRAFT",
                createdAt: new Date().toISOString(),
                createdBy: "admin",
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t.actions.add}
          </button>
        </div>

        {/* 规则列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.loading}
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.noData}
            </div>
          ) : (
            <div className="divide-y">
              {filteredRules.map(rule => (
                <div key={rule.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                      {typeIcons[rule.type]}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {rule.name[lang]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rule.status]}`}
                        >
                          {t.rule.statuses[rule.status]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {rule.description[lang]}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          {typeIcons[rule.type]}
                          {t.rule.types[rule.type]}
                        </span>
                        {rule.startTime && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(rule.startTime)} -{" "}
                            {formatDateTime(rule.endTime)}
                          </span>
                        )}
                        {rule.totalUsageLimit && (
                          <span>
                            {t.rule.currentUsage}: {rule.currentUsage}/
                            {rule.totalUsageLimit}
                          </span>
                        )}
                      </div>
                      {rule.rejectionReason && (
                        <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {t.rule.rejectionReason}: {rule.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      {/* 审批流操作 */}
                      {rule.status === "DRAFT" && (
                        <button
                          onClick={() => submitForApproval(rule.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                        >
                          <Send className="w-3 h-3" />
                          {t.actions.submit}
                        </button>
                      )}
                      {rule.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            onClick={() => approveRule(rule.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                          >
                            <Check className="w-3 h-3" />
                            {t.actions.approve}
                          </button>
                          <button
                            onClick={() => rejectRule(rule.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            <XCircle className="w-3 h-3" />
                            {t.actions.reject}
                          </button>
                        </>
                      )}
                      {rule.status === "APPROVED" && (
                        <button
                          onClick={() => activateRule(rule.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                          <Check className="w-3 h-3" />
                          {t.actions.activate}
                        </button>
                      )}

                      {/* 编辑删除 */}
                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 编辑表单 */}
        {showForm && editingRule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingRule.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingRule(null);
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
                      {t.rule.nameRu}
                    </label>
                    <input
                      type="text"
                      value={editingRule.name.ru}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          name: { ...editingRule.name, ru: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.nameZh}
                    </label>
                    <input
                      type="text"
                      value={editingRule.name.zh}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          name: { ...editingRule.name, zh: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 描述 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.descRu}
                    </label>
                    <textarea
                      value={editingRule.description.ru}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          description: {
                            ...editingRule.description,
                            ru: e.target.value,
                          },
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.descZh}
                    </label>
                    <textarea
                      value={editingRule.description.zh}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          description: {
                            ...editingRule.description,
                            zh: e.target.value,
                          },
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.rule.type}
                  </label>
                  <select
                    value={editingRule.type}
                    onChange={e =>
                      setEditingRule({
                        ...editingRule,
                        type: e.target.value as RuleType,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {Object.entries(t.rule.types).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 配置参数 */}
                <div className="grid grid-cols-2 gap-4">
                  {(editingRule.type === "FIXED_DISCOUNT" ||
                    editingRule.type === "SPEND_GET") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.rule.config.discountValue}
                      </label>
                      <input
                        type="number"
                        value={editingRule.config.discountValue || ""}
                        onChange={e =>
                          setEditingRule({
                            ...editingRule,
                            config: {
                              ...editingRule.config,
                              discountValue: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                  {(editingRule.type === "PERCENTAGE_OFF" ||
                    editingRule.type === "SECOND_HALF_PRICE") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.rule.config.discountPercent}
                      </label>
                      <input
                        type="number"
                        value={editingRule.config.discountPercent || ""}
                        onChange={e =>
                          setEditingRule({
                            ...editingRule,
                            config: {
                              ...editingRule.config,
                              discountPercent: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                  {editingRule.type === "SPEND_GET" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.rule.config.minSpend}
                      </label>
                      <input
                        type="number"
                        value={editingRule.config.minSpend || ""}
                        onChange={e =>
                          setEditingRule({
                            ...editingRule,
                            config: {
                              ...editingRule.config,
                              minSpend: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* 时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.startTime}
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingRule.startTime
                          ? editingRule.startTime.slice(0, 16)
                          : ""
                      }
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          startTime: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.endTime}
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingRule.endTime
                          ? editingRule.endTime.slice(0, 16)
                          : ""
                      }
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          endTime: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 其他设置 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.priority}
                    </label>
                    <input
                      type="number"
                      value={editingRule.priority}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          priority: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.maxUsage}
                    </label>
                    <input
                      type="number"
                      value={editingRule.maxUsagePerUser || ""}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          maxUsagePerUser:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.rule.totalLimit}
                    </label>
                    <input
                      type="number"
                      value={editingRule.totalUsageLimit || ""}
                      onChange={e =>
                        setEditingRule({
                          ...editingRule,
                          totalUsageLimit:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 可叠加 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="stackable"
                    checked={editingRule.isStackable}
                    onChange={e =>
                      setEditingRule({
                        ...editingRule,
                        isStackable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor="stackable"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t.rule.stackable}
                  </label>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingRule(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveRule(editingRule)}
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
