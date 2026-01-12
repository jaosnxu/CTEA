/**
 * 腾讯云 API 密钥验证测试
 *
 * 验证 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 是否有效
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";

// 腾讯云 API 签名生成
function generateTencentCloudSignature(
  secretId: string,
  secretKey: string,
  service: string,
  payload: string,
  timestamp: number
): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const algorithm = "TC3-HMAC-SHA256";

  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const host = `${service}.tencentcloudapi.com`;
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = crypto
    .createHmac("sha256", `TC3${secretKey}`)
    .update(date)
    .digest();
  const secretService = crypto
    .createHmac("sha256", secretDate)
    .update(service)
    .digest();
  const secretSigning = crypto
    .createHmac("sha256", secretService)
    .update("tc3_request")
    .digest();
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign)
    .digest("hex");

  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

describe("腾讯云 API 密钥验证", () => {
  it("应该能够成功调用腾讯云 API 进行身份验证", async () => {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;

    // 检查环境变量是否存在
    expect(secretId).toBeDefined();
    expect(secretKey).toBeDefined();
    expect(secretId).not.toBe("");
    expect(secretKey).not.toBe("");

    console.log("[Test] SecretId 前8位:", secretId?.substring(0, 8) + "...");

    // 使用 CAM 服务的 GetUserAppId 接口进行轻量级验证
    // 这是一个只读接口，用于验证密钥是否有效
    const timestamp = Math.floor(Date.now() / 1000);
    const service = "cam";
    const payload = JSON.stringify({});

    const authorization = generateTencentCloudSignature(
      secretId!,
      secretKey!,
      service,
      payload,
      timestamp
    );

    const response = await fetch("https://cam.tencentcloudapi.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: "cam.tencentcloudapi.com",
        "X-TC-Action": "GetUserAppId",
        "X-TC-Version": "2019-01-16",
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Region": "ap-guangzhou",
        Authorization: authorization,
      },
      body: payload,
    });

    const result = await response.json();

    console.log("[Test] API 响应:", JSON.stringify(result, null, 2));

    // 检查响应
    // 如果密钥有效，会返回 AppId 或权限错误（但不是签名错误）
    // 签名错误码：AuthFailure.SignatureFailure, AuthFailure.SecretIdNotFound
    const errorCode = result.Response?.Error?.Code;

    if (errorCode) {
      // 如果是签名相关错误，说明密钥无效
      const signatureErrors = [
        "AuthFailure.SignatureFailure",
        "AuthFailure.SecretIdNotFound",
        "AuthFailure.InvalidSecretId",
        "AuthFailure.SignatureExpire",
      ];

      if (signatureErrors.includes(errorCode)) {
        console.error("[Test] ❌ 密钥验证失败:", errorCode);
        throw new Error(`腾讯云密钥无效: ${errorCode}`);
      }

      // 其他错误（如权限不足）说明密钥本身是有效的
      console.log("[Test] ⚠️ API 返回错误，但密钥有效:", errorCode);
    }

    // 如果有 AppId 返回，说明完全成功
    if (result.Response?.AppId) {
      console.log("[Test] ✅ 密钥验证成功! AppId:", result.Response.AppId);
    }

    // 只要不是签名错误，就认为密钥有效
    expect(result.Response).toBeDefined();
  }, 30000); // 30秒超时
});
