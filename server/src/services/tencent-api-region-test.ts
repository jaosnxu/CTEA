/**
 * 腾讯云 API 多区域测试
 *
 * 测试不同地域的 API 节点是否能正常工作
 */

import crypto from "crypto";

// 腾讯云 API 签名生成
function generateTencentCloudSignature(
  secretId: string,
  secretKey: string,
  service: string,
  region: string,
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

// 测试单个区域
async function testRegion(region: string, secretId: string, secretKey: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`测试区域: ${region}`);
  console.log("=".repeat(80));

  const timestamp = Math.floor(Date.now() / 1000);
  const service = "cam";
  const payload = JSON.stringify({});

  const authorization = generateTencentCloudSignature(
    secretId,
    secretKey,
    service,
    region,
    payload,
    timestamp
  );

  try {
    const response = await fetch("https://cam.tencentcloudapi.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: "cam.tencentcloudapi.com",
        "X-TC-Action": "GetUserAppId",
        "X-TC-Version": "2019-01-16",
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Region": region,
        Authorization: authorization,
      },
      body: payload,
    });

    const result = await response.json();

    console.log("HTTP 状态码:", response.status);
    console.log("完整响应:");
    console.log(JSON.stringify(result, null, 2));

    if (result.Response?.Error) {
      const errorCode = result.Response.Error.Code;
      const errorMessage = result.Response.Error.Message;
      const requestId = result.Response.RequestId;

      console.log("\n❌ 错误详情:");
      console.log("  错误代码:", errorCode);
      console.log("  错误消息:", errorMessage);
      console.log("  请求ID:", requestId);

      // 判断是否为签名错误
      const signatureErrors = [
        "AuthFailure.SignatureFailure",
        "AuthFailure.SecretIdNotFound",
        "AuthFailure.InvalidSecretId",
        "AuthFailure.SignatureExpire",
      ];

      if (signatureErrors.includes(errorCode)) {
        console.log("  ⚠️  这是密钥相关错误，密钥可能无效或未生效");
        return false;
      } else {
        console.log("  ✅ 这不是密钥错误，密钥本身可能有效");
        return true;
      }
    }

    if (result.Response?.AppId) {
      console.log("\n✅ 成功! AppId:", result.Response.AppId);
      console.log("   请求ID:", result.Response.RequestId);
      return true;
    }

    return false;
  } catch (error) {
    console.log("\n❌ 网络错误:", error);
    return false;
  }
}

// 主测试函数
async function main() {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    console.error("❌ 环境变量未设置: TENCENT_SECRET_ID 或 TENCENT_SECRET_KEY");
    process.exit(1);
  }

  console.log(
    "╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║           腾讯云 API 多区域测试                                    ║"
  );
  console.log(
    "╠════════════════════════════════════════════════════════════════════╣"
  );
  console.log(
    `║ SecretId: ${secretId.substring(0, 12)}...                                 ║`
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );

  const regions = [
    "ap-singapore", // 新加坡
    "ap-hongkong", // 香港
    "ap-guangzhou", // 广州
    "ap-beijing", // 北京
    "ap-shanghai", // 上海
  ];

  const results: Record<string, boolean> = {};

  for (const region of regions) {
    results[region] = await testRegion(region, secretId, secretKey);
    // 等待 1 秒，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(
    "\n╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║           测试结果汇总                                             ║"
  );
  console.log(
    "╠════════════════════════════════════════════════════════════════════╣"
  );

  for (const [region, success] of Object.entries(results)) {
    const status = success ? "✅ 成功" : "❌ 失败";
    console.log(`║ ${region.padEnd(20)} ${status.padEnd(40)} ║`);
  }

  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );

  const successCount = Object.values(results).filter(Boolean).length;

  if (successCount === 0) {
    console.log("\n⚠️  所有区域测试均失败，密钥可能无效或尚未生效。");
    console.log("建议：等待 5-10 分钟后重试，或检查密钥是否正确。");
  } else if (successCount < regions.length) {
    console.log(
      `\n✅ 部分区域测试成功（${successCount}/${regions.length}），密钥有效！`
    );
    console.log("建议：使用测试成功的区域进行后续开发。");
  } else {
    console.log(`\n✅ 所有区域测试成功！密钥完全有效！`);
  }
}

// 运行测试
main().catch(console.error);
