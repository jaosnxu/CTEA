/**
 * CHUTEA 智慧中台 - 提现审批列表页面
 *
 * 功能：
 * 1. 提现申请列表展示
 * 2. 审批操作（批准/拒绝）
 * 3. 二次确认弹窗
 * 4. 财务凭证生成
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ==================== 类型定义 ====================

interface Influencer {
  id: number;
  userId: number | null;
  nickname: string | null;
  realName: any;
  user?: {
    id: number;
    phone: string | null;
    name: string | null;
  } | null;
}

interface Withdrawal {
  id: number;
  influencerId: number;
  amount: string;
  bankInfo: any;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  processedBy: number | null;
  processedAt: string | null;
  rejectReason: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  influencer: Influencer | null;
}

interface WithdrawalStats {
  pending: { count: number; total: number };
  processing: { count: number; total: number };
  completed: { count: number; total: number };
  rejected: { count: number; total: number };
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  type?: "approve" | "reject";
  rejectReason?: string;
  onRejectReasonChange?: (reason: string) => void;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление выводом средств",
    subtitle: "Обработка заявок на вывод средств инфлюенсеров",
    stats: {
      pending: "Ожидает",
      processing: "В обработке",
      completed: "Завершено",
      rejected: "Отклонено",
    },
    table: {
      id: "ID",
      influencer: "Инфлюенсер",
      amount: "Сумма",
      status: "Статус",
      createdAt: "Дата заявки",
      actions: "Действия",
    },
    status: {
      PENDING: "Ожидает",
      PROCESSING: "В обработке",
      COMPLETED: "Завершено",
      REJECTED: "Отклонено",
    },
    actions: {
      approve: "Одобрить",
      reject: "Отклонить",
      complete: "Завершить",
      view: "Просмотр",
    },
    modal: {
      approveTitle: "Подтверждение одобрения",
      approveMessage:
        "Вы уверены, что хотите одобрить эту заявку на вывод средств?",
      rejectTitle: "Подтверждение отклонения",
      rejectMessage: "Укажите причину отклонения:",
      rejectPlaceholder: "Введите причину отклонения...",
      confirm: "Подтвердить",
      cancel: "Отмена",
      processing: "Обработка...",
    },
    filter: {
      all: "Все",
      pending: "Ожидает",
      processing: "В обработке",
      completed: "Завершено",
      rejected: "Отклонено",
    },
    empty: "Нет заявок на вывод средств",
    loading: "Загрузка...",
    error: "Ошибка загрузки данных",
    success: {
      approved: "Заявка успешно одобрена",
      rejected: "Заявка отклонена",
      completed: "Вывод завершён",
    },
    voucher: {
      title: "Финансовый документ",
      voucherNo: "Номер документа",
      type: "Тип",
      amount: "Сумма",
      created: "Создан",
    },
  },
  zh: {
    title: "提现管理",
    subtitle: "处理达人提现申请",
    stats: {
      pending: "待审批",
      processing: "处理中",
      completed: "已完成",
      rejected: "已拒绝",
    },
    table: {
      id: "ID",
      influencer: "达人",
      amount: "金额",
      status: "状态",
      createdAt: "申请时间",
      actions: "操作",
    },
    status: {
      PENDING: "待审批",
      PROCESSING: "处理中",
      COMPLETED: "已完成",
      REJECTED: "已拒绝",
    },
    actions: {
      approve: "批准",
      reject: "拒绝",
      complete: "完成",
      view: "查看",
    },
    modal: {
      approveTitle: "确认批准",
      approveMessage: "确定要批准这笔提现申请吗？",
      rejectTitle: "确认拒绝",
      rejectMessage: "请输入拒绝原因：",
      rejectPlaceholder: "输入拒绝原因...",
      confirm: "确认",
      cancel: "取消",
      processing: "处理中...",
    },
    filter: {
      all: "全部",
      pending: "待审批",
      processing: "处理中",
      completed: "已完成",
      rejected: "已拒绝",
    },
    empty: "暂无提现申请",
    loading: "加载中...",
    error: "加载数据失败",
    success: {
      approved: "申请已批准",
      rejected: "申请已拒绝",
      completed: "提现已完成",
    },
    voucher: {
      title: "财务凭证",
      voucherNo: "凭证编号",
      type: "类型",
      amount: "金额",
      created: "创建时间",
    },
  },
};

// ==================== 确认弹窗组件 ====================

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading,
  type,
  rejectReason,
  onRejectReasonChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>

        {type === "reject" ? (
          <div className="mb-6">
            <p className="text-gray-600 mb-3">{message}</p>
            <textarea
              value={rejectReason || ""}
              onChange={e => onRejectReasonChange?.(e.target.value)}
              placeholder={message}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        ) : (
          <p className="text-gray-600 mb-6">{message}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || (type === "reject" && !rejectReason?.trim())}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
              type === "reject"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isLoading ? "⏳" : ""} {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 凭证弹窗组件 ====================

interface VoucherModalProps {
  isOpen: boolean;
  voucher: any;
  onClose: () => void;
  lang: "ru" | "zh";
}

const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  voucher,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !voucher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            📄 {t.voucher.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.voucher.voucherNo}:</span>
              <span className="font-mono font-bold text-green-700">
                {voucher.voucherNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.voucher.type}:</span>
              <span className="font-medium">{voucher.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.voucher.amount}:</span>
              <span className="font-bold text-2xl text-green-600">
                ₽ {voucher.amount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.voucher.created}:</span>
              <span className="text-sm">
                {new Date(voucher.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
        >
          {t.modal.cancel}
        </button>
      </div>
    </div>
  );
};

// ==================== 主页面组件 ====================

export default function WithdrawalsPage() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "approve" | "reject";
    withdrawalId: number | null;
  }>({ isOpen: false, type: "approve", withdrawalId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [voucherModal, setVoucherModal] = useState<{
    isOpen: boolean;
    voucher: any;
  }>({ isOpen: false, voucher: null });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = translations[lang];

  // 加载数据
  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filter !== "all" && { status: filter.toUpperCase() }),
      });

      const response = await fetch(`/api/finance/withdrawals?${params}`);
      const data = await response.json();

      if (data.success) {
        setWithdrawals(data.data.withdrawals);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        setError(data.error?.message || t.error);
      }
    } catch (err) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [filter, page]);

  // 处理审批
  const handleApprove = async () => {
    if (!confirmModal.withdrawalId) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/finance/withdrawals/${confirmModal.withdrawalId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: confirmModal.type,
            reason: confirmModal.type === "reject" ? rejectReason : undefined,
            adminName: "Admin",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          confirmModal.type === "approve"
            ? t.success.approved
            : t.success.rejected
        );

        // 显示凭证
        if (data.data.voucher) {
          setVoucherModal({ isOpen: true, voucher: data.data.voucher });
        }

        // 刷新列表
        loadWithdrawals();

        // 清除成功消息
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error?.message || t.error);
      }
    } catch (err) {
      setError(t.error);
    } finally {
      setProcessing(false);
      setConfirmModal({ isOpen: false, type: "approve", withdrawalId: null });
      setRejectReason("");
    }
  };

  // 格式化金额
  const formatAmount = (amount: string | number) => {
    return `₽ ${Number(amount).toLocaleString()}`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === "ru" ? "ru-RU" : "zh-CN");
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">💰 {t.title}</h1>
          <p className="text-gray-600 mt-1">{t.subtitle}</p>
        </div>

        {/* 成功消息 */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            ✅ {successMessage}
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="text-yellow-600 text-sm font-medium">
                {t.stats.pending}
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {stats.pending.count}
              </div>
              <div className="text-sm text-yellow-600">
                {formatAmount(stats.pending.total)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-blue-600 text-sm font-medium">
                {t.stats.processing}
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {stats.processing.count}
              </div>
              <div className="text-sm text-blue-600">
                {formatAmount(stats.processing.total)}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-green-600 text-sm font-medium">
                {t.stats.completed}
              </div>
              <div className="text-2xl font-bold text-green-700">
                {stats.completed.count}
              </div>
              <div className="text-sm text-green-600">
                {formatAmount(stats.completed.total)}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="text-red-600 text-sm font-medium">
                {t.stats.rejected}
              </div>
              <div className="text-2xl font-bold text-red-700">
                {stats.rejected.count}
              </div>
              <div className="text-sm text-red-600">
                {formatAmount(stats.rejected.total)}
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(
            ["all", "pending", "processing", "completed", "rejected"] as const
          ).map(f => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t.filter[f]}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t.loading}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t.empty}</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.id}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.influencer}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.amount}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.status}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.createdAt}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.table.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-mono text-gray-900">
                        #{w.id}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {w.influencer?.nickname ||
                            w.influencer?.realName?.ru ||
                            `ID: ${w.influencerId}`}
                        </div>
                        {w.influencer?.user?.phone && (
                          <div className="text-xs text-gray-500">
                            {w.influencer.user.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">
                        {formatAmount(w.amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(w.status)}`}
                        >
                          {t.status[w.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {w.status === "PENDING" && (
                            <>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "approve",
                                    withdrawalId: w.id,
                                  })
                                }
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                              >
                                ✓ {t.actions.approve}
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "reject",
                                    withdrawalId: w.id,
                                  })
                                }
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                              >
                                ✕ {t.actions.reject}
                              </button>
                            </>
                          )}
                          {w.status === "PROCESSING" && (
                            <button
                              onClick={() => {
                                /* TODO: Complete */
                              }}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              ✓ {t.actions.complete}
                            </button>
                          )}
                          {w.transactionId && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                              {w.transactionId}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  ←
                </button>
                <span className="px-3 py-1">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 确认弹窗 */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={
            confirmModal.type === "approve"
              ? t.modal.approveTitle
              : t.modal.rejectTitle
          }
          message={
            confirmModal.type === "approve"
              ? t.modal.approveMessage
              : t.modal.rejectMessage
          }
          confirmText={processing ? t.modal.processing : t.modal.confirm}
          cancelText={t.modal.cancel}
          onConfirm={handleApprove}
          onCancel={() => {
            setConfirmModal({
              isOpen: false,
              type: "approve",
              withdrawalId: null,
            });
            setRejectReason("");
          }}
          isLoading={processing}
          type={confirmModal.type}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
        />

        {/* 凭证弹窗 */}
        <VoucherModal
          isOpen={voucherModal.isOpen}
          voucher={voucherModal.voucher}
          onClose={() => setVoucherModal({ isOpen: false, voucher: null })}
          lang={lang}
        />
      </div>
    </AdminLayout>
  );
}
