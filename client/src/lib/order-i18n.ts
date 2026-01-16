/**
 * Order Internationalization (i18n) Utilities
 * 
 * Provides translation support for order-related UI elements
 */

export type Locale = "en" | "ru" | "zh";

interface Translations {
  en: string;
  ru: string;
  zh: string;
}

/**
 * Order Status Translations
 */
const orderStatusTranslations: Record<string, Translations> = {
  PENDING: {
    en: "Pending",
    ru: "В ожидании",
    zh: "待处理",
  },
  CONFIRMED: {
    en: "Confirmed",
    ru: "Подтверждён",
    zh: "已确认",
  },
  PREPARING: {
    en: "Preparing",
    ru: "Готовится",
    zh: "准备中",
  },
  READY: {
    en: "Ready",
    ru: "Готов",
    zh: "准备就绪",
  },
  DELIVERING: {
    en: "Delivering",
    ru: "Доставляется",
    zh: "配送中",
  },
  COMPLETED: {
    en: "Completed",
    ru: "Завершён",
    zh: "已完成",
  },
  CANCELLED: {
    en: "Cancelled",
    ru: "Отменён",
    zh: "已取消",
  },
  REFUNDED: {
    en: "Refunded",
    ru: "Возврат",
    zh: "已退款",
  },
};

/**
 * Payment Status Translations
 */
const paymentStatusTranslations: Record<string, Translations> = {
  PENDING: {
    en: "Payment Pending",
    ru: "Ожидает оплаты",
    zh: "待支付",
  },
  PROCESSING: {
    en: "Processing",
    ru: "Обрабатывается",
    zh: "处理中",
  },
  PAID: {
    en: "Paid",
    ru: "Оплачено",
    zh: "已支付",
  },
  COMPLETED: {
    en: "Payment Completed",
    ru: "Оплата завершена",
    zh: "支付完成",
  },
  FAILED: {
    en: "Payment Failed",
    ru: "Ошибка оплаты",
    zh: "支付失败",
  },
  CANCELLED: {
    en: "Payment Cancelled",
    ru: "Оплата отменена",
    zh: "支付取消",
  },
};

/**
 * Refund Status Translations
 */
const refundStatusTranslations: Record<string, Translations> = {
  PENDING: {
    en: "Refund Pending",
    ru: "Возврат ожидается",
    zh: "退款待处理",
  },
  APPROVED: {
    en: "Approved",
    ru: "Одобрено",
    zh: "已批准",
  },
  REJECTED: {
    en: "Rejected",
    ru: "Отклонено",
    zh: "已拒绝",
  },
  PROCESSING: {
    en: "Processing Refund",
    ru: "Обработка возврата",
    zh: "退款处理中",
  },
  COMPLETED: {
    en: "Refund Completed",
    ru: "Возврат завершён",
    zh: "退款完成",
  },
  FAILED: {
    en: "Refund Failed",
    ru: "Ошибка возврата",
    zh: "退款失败",
  },
};

/**
 * After-Sales Request Type Translations
 */
const afterSalesTypeTranslations: Record<string, Translations> = {
  COMPLAINT: {
    en: "Complaint",
    ru: "Жалоба",
    zh: "投诉",
  },
  RETURN: {
    en: "Return",
    ru: "Возврат",
    zh: "退货",
  },
  EXCHANGE: {
    en: "Exchange",
    ru: "Обмен",
    zh: "换货",
  },
  QUALITY_ISSUE: {
    en: "Quality Issue",
    ru: "Проблема качества",
    zh: "质量问题",
  },
};

/**
 * Common UI Labels
 */
const commonLabels: Record<string, Translations> = {
  orderNumber: {
    en: "Order Number",
    ru: "Номер заказа",
    zh: "订单号",
  },
  customer: {
    en: "Customer",
    ru: "Клиент",
    zh: "客户",
  },
  store: {
    en: "Store",
    ru: "Магазин",
    zh: "门店",
  },
  status: {
    en: "Status",
    ru: "Статус",
    zh: "状态",
  },
  total: {
    en: "Total",
    ru: "Итого",
    zh: "总计",
  },
  items: {
    en: "Items",
    ru: "Товары",
    zh: "商品",
  },
  date: {
    en: "Date",
    ru: "Дата",
    zh: "日期",
  },
  actions: {
    en: "Actions",
    ru: "Действия",
    zh: "操作",
  },
  export: {
    en: "Export",
    ru: "Экспорт",
    zh: "导出",
  },
  delete: {
    en: "Delete",
    ru: "Удалить",
    zh: "删除",
  },
  cancel: {
    en: "Cancel",
    ru: "Отмена",
    zh: "取消",
  },
  confirm: {
    en: "Confirm",
    ru: "Подтвердить",
    zh: "确认",
  },
  search: {
    en: "Search",
    ru: "Поиск",
    zh: "搜索",
  },
  filter: {
    en: "Filter",
    ru: "Фильтр",
    zh: "筛选",
  },
  reset: {
    en: "Reset",
    ru: "Сброс",
    zh: "重置",
  },
  refresh: {
    en: "Refresh",
    ru: "Обновить",
    zh: "刷新",
  },
  loading: {
    en: "Loading...",
    ru: "Загрузка...",
    zh: "加载中...",
  },
  noResults: {
    en: "No results found",
    ru: "Результаты не найдены",
    zh: "未找到结果",
  },
  selectedCount: {
    en: "selected",
    ru: "выбрано",
    zh: "已选择",
  },
  batchUpdate: {
    en: "Batch Update",
    ru: "Массовое обновление",
    zh: "批量更新",
  },
  batchDelete: {
    en: "Batch Delete",
    ru: "Массовое удаление",
    zh: "批量删除",
  },
};

/**
 * Get translated order status label
 */
export function getOrderStatusI18n(
  status: string,
  locale: Locale = "en"
): string {
  return orderStatusTranslations[status]?.[locale] || status;
}

/**
 * Get translated payment status label
 */
export function getPaymentStatusI18n(
  status: string,
  locale: Locale = "en"
): string {
  return paymentStatusTranslations[status]?.[locale] || status;
}

/**
 * Get translated refund status label
 */
export function getRefundStatusI18n(
  status: string,
  locale: Locale = "en"
): string {
  return refundStatusTranslations[status]?.[locale] || status;
}

/**
 * Get translated after-sales type label
 */
export function getAfterSalesTypeI18n(
  type: string,
  locale: Locale = "en"
): string {
  return afterSalesTypeTranslations[type]?.[locale] || type;
}

/**
 * Get translated common UI label
 */
export function getCommonLabelI18n(
  key: string,
  locale: Locale = "en"
): string {
  return commonLabels[key]?.[locale] || key;
}

/**
 * Get browser locale
 */
export function getBrowserLocale(): Locale {
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "ru") return "ru";
  if (browserLang === "zh") return "zh";
  return "en";
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number | string,
  locale: Locale = "en"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  const localeMap = {
    en: "en-US",
    ru: "ru-RU",
    zh: "zh-CN",
  };

  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: "RUB",
  }).format(num);
}

/**
 * Format date based on locale
 */
export function formatDateI18n(
  date: string | Date,
  locale: Locale = "en"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const localeMap = {
    en: "en-US",
    ru: "ru-RU",
    zh: "zh-CN",
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}
