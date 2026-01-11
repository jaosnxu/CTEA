/**
 * 营业日计算工具函数
 * 
 * 功能：
 * 1. 根据订单时间和门店时区计算营业日
 * 2. 凌晨 00:00-04:00 的订单归属前一营业日
 * 3. 04:00 后的订单归属当天营业日
 * 
 * 使用场景：
 * - 财务报表生成
 * - 营业额统计
 * - 多时区门店管理
 */

import { DateTime } from 'luxon';

/**
 * 计算营业日
 * 
 * @param orderTime 订单时间（ISO 8601 格式）
 * @param timezone 门店时区（例如：Asia/Vladivostok）
 * @returns 营业日（YYYY-MM-DD 格式）
 * 
 * @example
 * // 海参崴凌晨 02:30 下单
 * calculateBusinessDate('2026-01-11T02:30:00+10:00', 'Asia/Vladivostok')
 * // 返回: '2026-01-10' (归属前一营业日)
 * 
 * @example
 * // 海参崴上午 10:00 下单
 * calculateBusinessDate('2026-01-11T10:00:00+10:00', 'Asia/Vladivostok')
 * // 返回: '2026-01-11' (归属当天营业日)
 */
export function calculateBusinessDate(orderTime: string, timezone: string): string {
  // 1. 将订单时间转换为指定时区的 DateTime 对象
  const orderDateTime = DateTime.fromISO(orderTime, { zone: timezone });

  // 2. 获取订单时间的小时数（0-23）
  const hour = orderDateTime.hour;

  // 3. 判断营业日归属
  if (hour >= 0 && hour < 4) {
    // 凌晨 00:00-04:00：归属前一营业日
    const businessDate = orderDateTime.minus({ days: 1 }).toFormat('yyyy-MM-dd');
    console.log(`[BusinessDate] 订单时间: ${orderTime}, 小时: ${hour}, 营业日: ${businessDate} (归属前一天)`);
    return businessDate;
  } else {
    // 04:00 后：归属当天营业日
    const businessDate = orderDateTime.toFormat('yyyy-MM-dd');
    console.log(`[BusinessDate] 订单时间: ${orderTime}, 小时: ${hour}, 营业日: ${businessDate} (归属当天)`);
    return businessDate;
  }
}

/**
 * 获取营业日的 UTC 偏移量
 * 
 * @param timezone 门店时区（例如：Asia/Vladivostok）
 * @returns UTC 偏移量（例如：+10:00）
 */
export function getUTCOffset(timezone: string): string {
  const now = DateTime.now().setZone(timezone);
  const offsetMinutes = now.offset;
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
}

/**
 * 批量计算营业日（用于测试）
 * 
 * @param orders 订单列表
 * @returns 带有营业日的订单列表
 */
export function batchCalculateBusinessDate(orders: Array<{ orderTime: string; timezone: string }>) {
  return orders.map((order) => ({
    ...order,
    businessDate: calculateBusinessDate(order.orderTime, order.timezone),
    utcOffset: getUTCOffset(order.timezone),
  }));
}
