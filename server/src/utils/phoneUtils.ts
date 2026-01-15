/**
 * CHUTEA 智慧中台 - 手机号工具函数
 * 
 * 提供手机号规范化和验证功能
 * - 规范化为 E.164 格式
 * - 验证手机号有效性
 */

import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

/**
 * 规范化手机号至 E.164 格式
 * 
 * @param phone - 接收到的用户手机号
 * @param defaultCountry - 默认国家代码（如无区号时使用），默认为 "RU"
 * @returns E.164 格式的手机号（如 +79001234567）
 * @throws Error 如果手机号无效
 * 
 * @example
 * normalizePhone("9001234567") // 返回 "+79001234567"
 * normalizePhone("+7 900 123-45-67") // 返回 "+79001234567"
 * normalizePhone("900 123-45-67", "RU") // 返回 "+79001234567"
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = "RU"
): string {
  // 移除空格和特殊字符，保留 + 号
  const cleanedPhone = phone.trim();

  // 解析手机号
  const parsed = parsePhoneNumberFromString(cleanedPhone, defaultCountry);

  // 验证有效性
  if (!parsed?.isValid()) {
    throw new Error(`手机号无效：${phone}`);
  }

  // 返回 E.164 格式（国际标准格式）
  return parsed.number;
}

/**
 * 验证手机号是否有效
 * 
 * @param phone - 手机号
 * @param defaultCountry - 默认国家代码
 * @returns 是否有效
 * 
 * @example
 * isValidPhone("+79001234567") // 返回 true
 * isValidPhone("invalid") // 返回 false
 */
export function isValidPhone(
  phone: string,
  defaultCountry: CountryCode = "RU"
): boolean {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    return parsed?.isValid() ?? false;
  } catch {
    return false;
  }
}

/**
 * 获取手机号的国家代码
 * 
 * @param phone - 手机号
 * @param defaultCountry - 默认国家代码
 * @returns 国家代码（如 "RU"）或 undefined
 * 
 * @example
 * getPhoneCountry("+79001234567") // 返回 "RU"
 * getPhoneCountry("+8613800138000") // 返回 "CN"
 */
export function getPhoneCountry(
  phone: string,
  defaultCountry: CountryCode = "RU"
): string | undefined {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    return parsed?.country;
  } catch {
    return undefined;
  }
}
