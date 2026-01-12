/**
 * WebSocket 集成测试脚本
 *
 * 测试场景：
 * 1. 创建 HTTP 服务器
 * 2. 初始化 WebSocket 服务
 * 3. 模拟 POS 确认订单
 * 4. 验证事件推送
 *
 * 运行方式：
 * ```bash
 * pnpm exec tsx server/src/test-websocket.ts
 * ```
 */

import { createServer } from "http";
import {
  initWebSocketService,
  getWebSocketService,
} from "./services/websocket";

async function main() {
  console.log("=== WebSocket 集成测试 ===\n");

  // 1. 创建 HTTP 服务器
  const httpServer = createServer();
  const port = 3001;

  httpServer.listen(port, () => {
    console.log(`[HTTP] 服务器已启动: http://localhost:${port}\n`);
  });

  // 2. 初始化 WebSocket 服务
  const wsService = initWebSocketService(httpServer);
  console.log("[WebSocket] 服务已初始化\n");

  // 等待 2 秒，模拟客户端连接
  await delay(2000);

  // 3. 模拟 POS 确认订单（待制作 → 制作中）
  console.log("--- 测试场景 1: POS 开始制作订单 ---");
  wsService.emitOrderStatusChange({
    orderId: "order-test-001",
    pickupCode: "T9999",
    storeId: "store-001",
    storeName: "莫斯科红场店",
    status: "preparing",
    items: ["经典奶茶 x2", "芒果波波茶 x1"],
    totalAmount: 580,
    customerId: "user-123",
    timestamp: new Date(),
  });

  await delay(3000);

  // 4. 模拟订单完成（制作中 → 待取货）
  console.log("\n--- 测试场景 2: POS 确认订单已好 ---");
  wsService.emitOrderStatusChange({
    orderId: "order-test-001",
    pickupCode: "T9999",
    storeId: "store-001",
    storeName: "莫斯科红场店",
    status: "ready",
    items: ["经典奶茶 x2", "芒果波波茶 x1"],
    totalAmount: 580,
    customerId: "user-123",
    timestamp: new Date(),
  });

  await delay(3000);

  // 5. 模拟新订单创建
  console.log("\n--- 测试场景 3: 新订单创建 ---");
  wsService.emitOrderCreated({
    orderId: "order-test-002",
    pickupCode: "T8888",
    storeId: "store-001",
    storeName: "莫斯科红场店",
    status: "pending",
    items: ["抹茶拿铁 x1"],
    totalAmount: 250,
    customerId: "user-456",
    timestamp: new Date(),
  });

  await delay(3000);

  // 6. 模拟订单取消
  console.log("\n--- 测试场景 4: 订单取消 ---");
  wsService.emitOrderCancelled({
    orderId: "order-test-002",
    pickupCode: "T8888",
    storeId: "store-001",
    storeName: "莫斯科红场店",
    status: "cancelled",
    items: ["抹茶拿铁 x1"],
    totalAmount: 250,
    customerId: "user-456",
    timestamp: new Date(),
  });

  await delay(2000);

  // 7. 显示连接统计
  console.log("\n--- 连接统计 ---");
  const stats = wsService.getStats();
  console.log(`连接客户端数: ${stats.connectedClients}`);
  console.log(`房间列表: ${stats.rooms.join(", ")}`);

  console.log("\n=== 测试完成 ===");
  console.log("提示：");
  console.log("- 打开浏览器访问 http://localhost:3000/call-screen 查看叫号屏");
  console.log(
    "- 打开浏览器访问 http://localhost:3000/admin/pos-simulator 查看 POS 后台"
  );
  console.log("- 按 Ctrl+C 停止测试服务器\n");
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
main().catch(console.error);
