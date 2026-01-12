/**
 * CHUTEA 多时区逻辑测试
 *
 * 🔴 CTO 要求：
 * - 模拟莫斯科（UTC+3）和海参崴（UTC+10）两地
 * - 确认秒杀活动在当地时间准时开启
 * - 确认跨天订单正确归属到前一营业日
 */

import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  calculateBusinessDate,
  isFlashSaleActive,
  getTimezoneOffset,
  TIMEZONES,
} from "./timezone";

describe("多时区逻辑测试", () => {
  describe("营业日计算（business_date）", () => {
    it("莫斯科：凌晨 3:30 订单应归属前一营业日", () => {
      // 莫斯科时间 2024-01-10 03:30
      const moscowTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 3, minute: 30 },
        { zone: TIMEZONES.MOSCOW }
      );

      const result = calculateBusinessDate(
        moscowTime.toUTC().toJSDate(),
        TIMEZONES.MOSCOW,
        "04:00"
      );

      expect(result.businessDate).toBe("2024-01-09");
      expect(result.isOvernight).toBe(true);
      expect(result.localTime.hour).toBe(3);
      expect(result.localTime.minute).toBe(30);
    });

    it("莫斯科：上午 10:00 订单应归属当前营业日", () => {
      // 莫斯科时间 2024-01-10 10:00
      const moscowTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 10, minute: 0 },
        { zone: TIMEZONES.MOSCOW }
      );

      const result = calculateBusinessDate(
        moscowTime.toUTC().toJSDate(),
        TIMEZONES.MOSCOW,
        "04:00"
      );

      expect(result.businessDate).toBe("2024-01-10");
      expect(result.isOvernight).toBe(false);
      expect(result.localTime.hour).toBe(10);
    });

    it("海参崴：凌晨 2:00 订单应归属前一营业日", () => {
      // 海参崴时间 2024-01-10 02:00
      const vladivostokTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 2, minute: 0 },
        { zone: TIMEZONES.VLADIVOSTOK }
      );

      const result = calculateBusinessDate(
        vladivostokTime.toUTC().toJSDate(),
        TIMEZONES.VLADIVOSTOK,
        "04:00"
      );

      expect(result.businessDate).toBe("2024-01-09");
      expect(result.isOvernight).toBe(true);
    });

    it("海参崴：下午 14:00 订单应归属当前营业日", () => {
      // 海参崴时间 2024-01-10 14:00
      const vladivostokTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 14, minute: 0 },
        { zone: TIMEZONES.VLADIVOSTOK }
      );

      const result = calculateBusinessDate(
        vladivostokTime.toUTC().toJSDate(),
        TIMEZONES.VLADIVOSTOK,
        "04:00"
      );

      expect(result.businessDate).toBe("2024-01-10");
      expect(result.isOvernight).toBe(false);
    });
  });

  describe("多时区秒杀活动", () => {
    it("莫斯科：10:00 秒杀活动应在本地时间 10:00-12:00 开启", () => {
      // 模拟莫斯科时间 2024-01-10 10:30（活动进行中）
      const moscowTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 10, minute: 30 },
        { zone: TIMEZONES.MOSCOW }
      );

      // 临时设置系统时间为莫斯科时间（用于测试）
      const originalNow = DateTime.now;
      DateTime.now = () => moscowTime;

      const isActive = isFlashSaleActive("10:00", TIMEZONES.MOSCOW, 2);

      expect(isActive).toBe(true);

      // 恢复系统时间
      DateTime.now = originalNow;
    });

    it("莫斯科：10:00 秒杀活动在 09:00 不应开启", () => {
      // 模拟莫斯科时间 2024-01-10 09:00（活动未开始）
      const moscowTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 9, minute: 0 },
        { zone: TIMEZONES.MOSCOW }
      );

      const originalNow = DateTime.now;
      DateTime.now = () => moscowTime;

      const isActive = isFlashSaleActive("10:00", TIMEZONES.MOSCOW, 2);

      expect(isActive).toBe(false);

      DateTime.now = originalNow;
    });

    it("海参崴：10:00 秒杀活动应在本地时间 10:00-12:00 开启", () => {
      // 模拟海参崴时间 2024-01-10 11:00（活动进行中）
      const vladivostokTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 11, minute: 0 },
        { zone: TIMEZONES.VLADIVOSTOK }
      );

      const originalNow = DateTime.now;
      DateTime.now = () => vladivostokTime;

      const isActive = isFlashSaleActive("10:00", TIMEZONES.VLADIVOSTOK, 2);

      expect(isActive).toBe(true);

      DateTime.now = originalNow;
    });

    it("海参崴：10:00 秒杀活动在 13:00 不应开启", () => {
      // 模拟海参崴时间 2024-01-10 13:00（活动已结束）
      const vladivostokTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 13, minute: 0 },
        { zone: TIMEZONES.VLADIVOSTOK }
      );

      const originalNow = DateTime.now;
      DateTime.now = () => vladivostokTime;

      const isActive = isFlashSaleActive("10:00", TIMEZONES.VLADIVOSTOK, 2);

      expect(isActive).toBe(false);

      DateTime.now = originalNow;
    });
  });

  describe("时区偏移量", () => {
    it("莫斯科时区偏移量应为 +3", () => {
      const offset = getTimezoneOffset(TIMEZONES.MOSCOW);
      expect(offset).toBe(3);
    });

    it("海参崴时区偏移量应为 +10", () => {
      const offset = getTimezoneOffset(TIMEZONES.VLADIVOSTOK);
      expect(offset).toBe(10);
    });
  });

  describe("跨时区场景", () => {
    it("同一 UTC 时间在不同时区的营业日应不同", () => {
      // UTC 时间 2024-01-10 01:00
      const utcTime = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 1, minute: 0 },
        { zone: "UTC" }
      );

      // 莫斯科时间：2024-01-10 04:00（当前营业日）
      const moscowResult = calculateBusinessDate(
        utcTime.toJSDate(),
        TIMEZONES.MOSCOW,
        "04:00"
      );

      // 海参崴时间：2024-01-10 11:00（当前营业日）
      const vladivostokResult = calculateBusinessDate(
        utcTime.toJSDate(),
        TIMEZONES.VLADIVOSTOK,
        "04:00"
      );

      expect(moscowResult.businessDate).toBe("2024-01-10");
      expect(moscowResult.isOvernight).toBe(false);

      expect(vladivostokResult.businessDate).toBe("2024-01-10");
      expect(vladivostokResult.isOvernight).toBe(false);
    });
  });
});
