/**
 * 腾讯云 SMS Provider 测试
 *
 * 验证环境变量配置是否正确
 */

import { describe, it, expect } from "vitest";
import { getTencentSmsProvider } from "../tencent-sms-provider";

const hasEnvVars = !!(
  (process.env.TENCENT_SECRET_ID || process.env.TENCENT_SMS_SECRET_ID) &&
  (process.env.TENCENT_SECRET_KEY || process.env.TENCENT_SMS_SECRET_KEY)
);

describe("TencentSmsProvider", () => {
  describe("配置验证", () => {
    it("应该正确读取环境变量配置", async () => {
      const provider = getTencentSmsProvider();

      // 验证 provider 名称
      expect(provider.name).toBe("TENCENT");

      // 验证配置
      expect(provider.config.enabled).toBe(true);
      expect(provider.config.priority).toBe(1);
      expect(provider.config.regions).toContain("RU");
    });

        it.skipIf(!hasEnvVars)("应该检测到必要的环境变量", async () => {
          // 检查环境变量是否存在
          const secretId =
            process.env.TENCENT_SECRET_ID || process.env.TENCENT_SMS_SECRET_ID;
          const secretKey =
            process.env.TENCENT_SECRET_KEY || process.env.TENCENT_SMS_SECRET_KEY;
          const appId = process.env.TENCENT_SMS_APP_ID;
          const signName = process.env.TENCENT_SMS_SIGN_NAME;
          const templateId = process.env.TENCENT_SMS_TEMPLATE_ID_VERIFICATION;

          console.log("环境变量检查:");
          console.log("- TENCENT_SECRET_ID:", secretId ? "✅ 已配置" : "❌ 未配置");
          console.log(
            "- TENCENT_SECRET_KEY:",
            secretKey ? "✅ 已配置" : "❌ 未配置"
          );
          console.log("- TENCENT_SMS_APP_ID:", appId ? "✅ 已配置" : "❌ 未配置");
          console.log(
            "- TENCENT_SMS_SIGN_NAME:",
            signName ? "✅ 已配置" : "❌ 未配置"
          );
          console.log(
            "- TENCENT_SMS_TEMPLATE_ID_VERIFICATION:",
            templateId ? "✅ 已配置" : "❌ 未配置"
          );

          // 基本配置必须存在
          expect(secretId).toBeTruthy();
          expect(secretKey).toBeTruthy();
        });

    it("Provider 应该报告可用状态", async () => {
      const provider = getTencentSmsProvider();
      const isAvailable = await provider.isAvailable();

      console.log("Provider 可用性:", isAvailable ? "✅ 可用" : "❌ 不可用");

      // 如果配置了必要的环境变量，应该可用
      const secretId =
        process.env.TENCENT_SECRET_ID || process.env.TENCENT_SMS_SECRET_ID;
      const secretKey =
        process.env.TENCENT_SECRET_KEY || process.env.TENCENT_SMS_SECRET_KEY;
      const appId = process.env.TENCENT_SMS_APP_ID;

      if (secretId && secretKey && appId) {
        expect(isAvailable).toBe(true);
      }
    });

    it("应该能获取 Provider 状态", async () => {
      const provider = getTencentSmsProvider();
      const status = await provider.getStatus();

      console.log("Provider 状态:", JSON.stringify(status, null, 2));

      expect(status).toHaveProperty("available");
    });
  });
});
