/**
 * CHUTEA 多时区逻辑实现
 *
 * 核心功能：
 * - 营业日计算（business_date + is_overnight）
 * - 多时区秒杀活动判断
 * - UTC 时间与本地时间转换
 *
 * 依赖：luxon（时区处理库）
 */

import { DateTime } from "luxon";

/**
 * 营业日计算结果
 */
export interface BusinessDateResult {
  businessDate: string; // YYYY-MM-DD 格式
  isOvernight: boolean; // 是否跨天订单
  localTime: DateTime; // 门店本地时间
}

/**
 * 计算订单的营业日
 *
 * 规则：凌晨订单归属于前一营业日
 * 示例：
 * - 莫斯科时间 2024-01-10 03:30 → 营业日 2024-01-09（跨天订单）
 * - 莫斯科时间 2024-01-10 10:00 → 营业日 2024-01-10（正常订单）
 *
 * @param orderTimeUTC 订单时间（UTC）
 * @param storeTimezone 门店时区（IANA 时区 ID，如 Europe/Moscow）
 * @param closingTime 营业日结束时间（本地时间，默认 04:00）
 * @returns 营业日计算结果
 */
export function calculateBusinessDate(
  orderTimeUTC: Date,
  storeTimezone: string,
  closingTime: string = "04:00"
): BusinessDateResult {
  // 转换为门店本地时间
  const localTime = DateTime.fromJSDate(orderTimeUTC).setZone(storeTimezone);

  // 营业日结束时间（如凌晨4点）
  const closingHour = parseInt(closingTime.split(":")[0]);

  let businessDate = localTime.toISODate()!;
  let isOvernight = false;

  // 如果订单时间在凌晨0点到营业日结束时间之间，归属于前一天
  if (localTime.hour < closingHour) {
    businessDate = localTime.minus({ days: 1 }).toISODate()!;
    isOvernight = true;
  }

  return {
    businessDate,
    isOvernight,
    localTime,
  };
}

/**
 * 检查秒杀活动是否在指定门店开始
 *
 * 示例：
 * - 活动开始时间：10:00（本地时间）
 * - 莫斯科（UTC+3）：2024-01-10 10:00 → 活动开始
 * - 海参崴（UTC+10）：2024-01-10 10:00 → 活动开始
 *
 * @param activityStartTime 活动开始时间（本地时间，如 '10:00'）
 * @param storeTimezone 门店时区（IANA 时区 ID）
 * @param activityDurationHours 活动持续时间（小时，默认 2 小时）
 * @returns 活动是否正在进行
 */
export function isFlashSaleActive(
  activityStartTime: string,
  storeTimezone: string,
  activityDurationHours: number = 2
): boolean {
  // 获取门店当前时间
  const now = DateTime.now().setZone(storeTimezone);

  // 解析活动开始时间
  const [hour, minute] = activityStartTime.split(":").map(Number);
  const activityStart = now.set({ hour, minute, second: 0, millisecond: 0 });
  const activityEnd = activityStart.plus({ hours: activityDurationHours });

  // 检查当前时间是否在活动时间范围内
  return now >= activityStart && now < activityEnd;
}

/**
 * 获取门店当前本地时间
 *
 * @param storeTimezone 门店时区（IANA 时区 ID）
 * @returns 门店本地时间
 */
export function getStoreLocalTime(storeTimezone: string): DateTime {
  return DateTime.now().setZone(storeTimezone);
}

/**
 * 将 UTC 时间转换为门店本地时间
 *
 * @param utcTime UTC 时间
 * @param storeTimezone 门店时区（IANA 时区 ID）
 * @returns 门店本地时间
 */
export function convertUTCToStoreTime(
  utcTime: Date,
  storeTimezone: string
): DateTime {
  return DateTime.fromJSDate(utcTime).setZone(storeTimezone);
}

/**
 * 将门店本地时间转换为 UTC 时间
 *
 * @param localTime 门店本地时间
 * @param storeTimezone 门店时区（IANA 时区 ID）
 * @returns UTC 时间
 */
export function convertStoreTimeToUTC(
  localTime: Date,
  storeTimezone: string
): Date {
  return DateTime.fromJSDate(localTime, { zone: storeTimezone })
    .toUTC()
    .toJSDate();
}

/**
 * 获取时区的 UTC 偏移量（小时）
 *
 * @param storeTimezone 门店时区（IANA 时区 ID）
 * @returns UTC 偏移量（小时）
 */
export function getTimezoneOffset(storeTimezone: string): number {
  const now = DateTime.now().setZone(storeTimezone);
  return now.offset / 60; // 转换为小时
}

/**
 * 常用时区常量
 */
export const TIMEZONES = {
  MOSCOW: "Europe/Moscow", // UTC+3
  VLADIVOSTOK: "Asia/Vladivostok", // UTC+10
  YEKATERINBURG: "Asia/Yekaterinburg", // UTC+5
  NOVOSIBIRSK: "Asia/Novosibirsk", // UTC+7
  KRASNOYARSK: "Asia/Krasnoyarsk", // UTC+7
  IRKUTSK: "Asia/Irkutsk", // UTC+8
  YAKUTSK: "Asia/Yakutsk", // UTC+9
  MAGADAN: "Asia/Magadan", // UTC+11
  KAMCHATKA: "Asia/Kamchatka", // UTC+12
} as const;
