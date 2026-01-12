/**
 * MockIikoService - iiko 模拟实现
 *
 * 用途：内测版开发，模拟 iiko 环境
 * 特点：
 * 1. 严格按照 iiko 官方字段格式返回数据
 * 2. 包含成本字段，支持毛利分析
 * 3. 模拟订单状态流转
 * 4. 后期只需切换配置即可无缝对接真实 iiko
 */

import {
  IikoProvider,
  IikoMenuItem,
  IikoCreateOrderRequest,
  IikoCreateOrderResponse,
  IikoOrderStatus,
  IikoOrderStatusResponse,
  IikoSyncSalesRequest,
  IikoSyncSalesResponse,
  IikoSalesData,
  IikoModifier,
} from "./IikoProvider.interface";

/**
 * 内存存储（模拟数据库）
 */
interface MockOrderStorage {
  orderId: string;
  request: IikoCreateOrderRequest;
  status: IikoOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MockIikoService implements IikoProvider {
  private mockOrders: Map<string, MockOrderStorage> = new Map();
  private orderCounter = 1000;
  private menuCache: Map<string, IikoMenuItem[]> = new Map(); // 菜单缓存（用于价格对比）

  /**
   * 获取菜单数据（模拟 iiko 菜单格式）
   */
  async getMenu(storeId: string): Promise<IikoMenuItem[]> {
    // 模拟网络延迟
    await this.delay(100);

    // 返回符合 iiko 格式的菜单数据
    return [
      {
        id: "iiko-001",
        name: "经典奶茶",
        description: "精选红茶搭配新鲜牛奶，香浓顺滑",
        price: 180,
        cost: 65, // 成本价（用于毛利分析）
        category: "经典系列",
        imageUrl: "/images/products/classic_milk_tea.png",
        available: true,
        modifiers: this.getStandardModifiers(),
      },
      {
        id: "iiko-002",
        name: "珍珠奶茶",
        description: "Q弹珍珠搭配香醇奶茶，经典组合",
        price: 200,
        cost: 72,
        category: "经典系列",
        imageUrl: "/images/products/pearl_milk_tea.png",
        available: true,
        modifiers: this.getStandardModifiers(),
      },
      {
        id: "iiko-003",
        name: "芒果波波茶",
        description: "新鲜芒果果肉搭配爆珠，清爽香甜",
        price: 220,
        cost: 85,
        category: "水果系列",
        imageUrl: "/images/products/mango_boba_tea.png",
        available: true,
        modifiers: this.getStandardModifiers(),
      },
      {
        id: "iiko-004",
        name: "草莓奶昔",
        description: "新鲜草莓打碎，绵密顺滑",
        price: 240,
        cost: 92,
        category: "水果系列",
        imageUrl: "/images/products/strawberry_smoothie.png",
        available: true,
        modifiers: this.getStandardModifiers(),
      },
      {
        id: "iiko-005",
        name: "抹茶拿铁",
        description: "日本进口抹茶粉，浓郁香醇",
        price: 230,
        cost: 88,
        category: "特色系列",
        imageUrl: "/images/products/matcha_latte.png",
        available: true,
        modifiers: this.getStandardModifiers(),
      },
    ];
  }

  /**
   * 创建订单（模拟 iiko 订单创建）
   */
  async createOrder(
    request: IikoCreateOrderRequest
  ): Promise<IikoCreateOrderResponse> {
    // 模拟网络延迟
    await this.delay(200);

    // 生成 iiko 订单 ID
    const orderId = `IIKO-${Date.now()}-${this.orderCounter++}`;

    // 存储订单
    this.mockOrders.set(orderId, {
      orderId,
      request,
      status: IikoOrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(
      `[MockIikoService] 订单创建成功: ${orderId}, 提货码: ${request.pickupCode}`
    );

    return {
      success: true,
      orderId,
      externalOrderId: request.pickupCode,
    };
  }

  /**
   * 查询订单状态
   */
  async getOrderStatus(orderId: string): Promise<IikoOrderStatusResponse> {
    await this.delay(50);

    const order = this.mockOrders.get(orderId);
    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    return {
      orderId: order.orderId,
      status: order.status,
      pickupCode: order.request.pickupCode,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * 同步销售数据
   */
  async syncSales(
    request: IikoSyncSalesRequest
  ): Promise<IikoSyncSalesResponse> {
    await this.delay(300);

    // 筛选指定门店和时间范围的订单
    const salesData: IikoSalesData[] = [];

    this.mockOrders.forEach((order, orderId) => {
      if (
        order.request.storeId === request.storeId &&
        order.request.businessDate === request.businessDate &&
        order.status === IikoOrderStatus.COMPLETED
      ) {
        salesData.push({
          orderId: order.orderId,
          storeId: order.request.storeId,
          businessDate: order.request.businessDate,
          totalAmount: order.request.totalAmount,
          discountAmount: order.request.discountAmount || 0,
          paymentMethod: order.request.paymentMethod,
          items: order.request.items,
          createdAt: order.createdAt,
          completedAt: order.updatedAt,
        });
      }
    });

    console.log(
      `[MockIikoService] 销售数据同步: 门店 ${request.storeId}, 营业日 ${request.businessDate}, 订单数 ${salesData.length}`
    );

    return {
      success: true,
      salesData,
    };
  }

  /**
   * 更新订单状态（用于 POS 确认）
   */
  async updateOrderStatus(
    orderId: string,
    status: IikoOrderStatus
  ): Promise<boolean> {
    await this.delay(100);

    const order = this.mockOrders.get(orderId);
    if (!order) {
      console.error(`[MockIikoService] 订单不存在: ${orderId}`);
      return false;
    }

    order.status = status;
    order.updatedAt = new Date();

    console.log(
      `[MockIikoService] 订单状态更新: ${orderId}, 新状态: ${status}`
    );

    return true;
  }

  /**
   * 获取标准规格选项（温度、甜度、小料）
   */
  private getStandardModifiers(): IikoModifier[] {
    return [
      {
        id: "mod-temperature",
        name: "温度",
        type: "temperature",
        required: true,
        options: [
          { id: "temp-hot", name: "热", price: 0 },
          { id: "temp-warm", name: "温", price: 0 },
          { id: "temp-cold", name: "冷", price: 0 },
          { id: "temp-ice", name: "冰", price: 0 },
        ],
      },
      {
        id: "mod-sweetness",
        name: "甜度",
        type: "sweetness",
        required: true,
        options: [
          { id: "sweet-normal", name: "标准甜", price: 0 },
          { id: "sweet-less", name: "少甜", price: 0 },
          { id: "sweet-half", name: "半糖", price: 0 },
          { id: "sweet-none", name: "无糖", price: 0 },
        ],
      },
      {
        id: "mod-topping",
        name: "小料",
        type: "topping",
        required: false,
        maxQuantity: 3,
        options: [
          { id: "topping-pearl", name: "珍珠", price: 10 },
          { id: "topping-coconut", name: "椰果", price: 10 },
          { id: "topping-pudding", name: "布丁", price: 15 },
          { id: "topping-red-bean", name: "红豆", price: 12 },
          { id: "topping-grass-jelly", name: "仙草", price: 10 },
        ],
      },
      {
        id: "mod-size",
        name: "份量",
        type: "size",
        required: true,
        options: [
          { id: "size-medium", name: "中杯", price: 0 },
          { id: "size-large", name: "大杯", price: 20 },
        ],
      },
    ];
  }

  /**
   * 模拟网络延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 同步菜单并检查价格变动（价格熔断逻辑）
   *
   * @param storeId 门店 ID
   * @param newMenu 新菜单数据
   * @returns 同步结果
   */
  public async syncMenuWithPriceGuard(
    storeId: string,
    newMenu: IikoMenuItem[]
  ): Promise<{ success: boolean; warnings: string[]; syncedItems: number }> {
    await this.delay(100);

    const warnings: string[] = [];
    let syncedItems = 0;

    // 获取缓存的菜单数据
    const cachedMenu = this.menuCache.get(storeId) || [];

    // 遵循价格变动检查
    for (const newItem of newMenu) {
      const cachedItem = cachedMenu.find(item => item.id === newItem.id);

      if (cachedItem) {
        // 计算价格变动百分比
        const oldPrice = cachedItem.price;
        const newPrice = newItem.price;
        const priceChange = Math.abs(newPrice - oldPrice);
        const priceChangePercent = (priceChange / oldPrice) * 100;

        // ⚠️⚠️⚠️ 核心逻辑：价格变动 > 30% 触发熔断
        if (priceChangePercent > 30) {
          const warning = `[SYNC_WARN] Price variance too high (${priceChangePercent.toFixed(2)}%) for Item_ID: ${newItem.id} (${newItem.name}), old price: ${oldPrice}, new price: ${newPrice}, sync blocked.`;
          warnings.push(warning);
          console.warn(warning);
          // 不同步该商品
          continue;
        } else {
          console.log(
            `[SYNC_INFO] Price change within threshold (${priceChangePercent.toFixed(2)}%) for Item_ID: ${newItem.id} (${newItem.name}), old price: ${oldPrice}, new price: ${newPrice}, sync allowed.`
          );
        }
      }

      // 同步该商品
      syncedItems++;
    }

    // 更新缓存
    this.menuCache.set(storeId, newMenu);

    console.log(
      `[SYNC_SUMMARY] Store: ${storeId}, Total items: ${newMenu.length}, Synced: ${syncedItems}, Warnings: ${warnings.length}`
    );

    return {
      success: warnings.length === 0,
      warnings,
      syncedItems,
    };
  }

  /**
   * 获取所有订单（用于调试）
   */
  public getAllOrders(): MockOrderStorage[] {
    return Array.from(this.mockOrders.values());
  }

  /**
   * 清空所有订单（用于测试）
   */
  public clearAllOrders(): void {
    this.mockOrders.clear();
    this.orderCounter = 1000;
    console.log("[MockIikoService] 所有订单已清空");
  }
}
