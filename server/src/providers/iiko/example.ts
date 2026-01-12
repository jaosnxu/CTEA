/**
 * IikoProvider 使用示例
 *
 * 演示如何使用 IikoProvider 抽象层
 *
 * 运行方式：
 * ```bash
 * tsx server/src/providers/iiko/example.ts
 * ```
 */

import { getIikoProvider } from "./IikoProviderFactory";
import { IikoOrderStatus } from "./IikoProvider.interface";

async function main() {
  console.log("=== IikoProvider 使用示例 ===\n");

  // 1. 获取 IikoProvider 实例（自动根据环境变量选择 Mock 或 Real）
  const iikoProvider = getIikoProvider();

  try {
    // 2. 获取菜单数据
    console.log("1. 获取菜单数据...");
    const menu = await iikoProvider.getMenu("store-001");
    console.log(`   ✓ 获取到 ${menu.length} 个商品`);
    console.log(
      `   示例商品: ${menu[0].name} - ${menu[0].price} (成本: ${menu[0].cost})\n`
    );

    // 3. 创建订单
    console.log("2. 创建订单...");
    const orderResponse = await iikoProvider.createOrder({
      storeId: "store-001",
      customerId: "user-123",
      items: [
        {
          productId: menu[0].id,
          productName: menu[0].name,
          quantity: 2,
          price: menu[0].price,
          modifiers: [
            {
              modifierId: "mod-temperature",
              optionId: "temp-ice",
              optionName: "冰",
              quantity: 1,
              price: 0,
            },
            {
              modifierId: "mod-topping",
              optionId: "topping-pearl",
              optionName: "珍珠",
              quantity: 1,
              price: 10,
            },
          ],
        },
      ],
      pickupCode: "T1234",
      businessDate: "2026-01-10",
      orderType: "pickup",
      paymentMethod: "card",
      totalAmount: 380,
      discountAmount: 0,
      note: "少冰",
    });

    if (orderResponse.success) {
      console.log(`   ✓ 订单创建成功: ${orderResponse.orderId}`);
      console.log(`   提货码: ${orderResponse.externalOrderId}\n`);

      // 4. 查询订单状态
      console.log("3. 查询订单状态...");
      const statusResponse = await iikoProvider.getOrderStatus(
        orderResponse.orderId
      );
      console.log(`   ✓ 订单状态: ${statusResponse.status}`);
      console.log(`   提货码: ${statusResponse.pickupCode}`);
      console.log(`   更新时间: ${statusResponse.updatedAt}\n`);

      // 5. 模拟 POS 确认订单
      console.log("4. 模拟 POS 确认订单（待制作 → 制作中）...");
      const updated1 = await iikoProvider.updateOrderStatus(
        orderResponse.orderId,
        IikoOrderStatus.PREPARING
      );
      console.log(`   ✓ 状态更新成功: ${updated1}\n`);

      // 6. 模拟订单完成
      console.log("5. 模拟订单完成（制作中 → 待取货）...");
      const updated2 = await iikoProvider.updateOrderStatus(
        orderResponse.orderId,
        IikoOrderStatus.READY
      );
      console.log(`   ✓ 状态更新成功: ${updated2}\n`);

      // 7. 模拟取货完成
      console.log("6. 模拟取货完成（待取货 → 已完成）...");
      const updated3 = await iikoProvider.updateOrderStatus(
        orderResponse.orderId,
        IikoOrderStatus.COMPLETED
      );
      console.log(`   ✓ 状态更新成功: ${updated3}\n`);

      // 8. 同步销售数据
      console.log("7. 同步销售数据...");
      const salesResponse = await iikoProvider.syncSales({
        storeId: "store-001",
        businessDate: "2026-01-10",
        startTime: new Date("2026-01-10T00:00:00Z"),
        endTime: new Date("2026-01-10T23:59:59Z"),
      });

      if (salesResponse.success) {
        console.log(
          `   ✓ 同步成功，获取到 ${salesResponse.salesData.length} 条销售记录`
        );
        if (salesResponse.salesData.length > 0) {
          const sale = salesResponse.salesData[0];
          console.log(
            `   示例销售记录: 订单 ${sale.orderId}, 金额 ${sale.totalAmount}\n`
          );
        }
      }
    } else {
      console.error(`   ✗ 订单创建失败: ${orderResponse.message}`);
    }

    console.log("=== 演示完成 ===");
    console.log("\n提示：");
    console.log("- 当前使用的是 Mock 实现（内测模式）");
    console.log(
      "- 要切换到真实 iiko 环境，请在 .env 中设置 IIKO_PROVIDER=real"
    );
    console.log("- 切换后无需修改任何业务代码，系统会自动使用真实 iiko API\n");
  } catch (error) {
    console.error("错误:", error);
  }
}

// 运行示例
main();
