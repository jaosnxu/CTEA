/**
 * IikoProvider 接口定义
 * 
 * 核心原则：抽象层隔离，确保后期接入真实 iiko 环境"零成本切换"
 * 
 * 实现类：
 * - MockIikoService: 内测版模拟实现
 * - RealIikoService: 生产环境真实实现（对接 iikoWeb Public API）
 */

/**
 * iiko 菜单项（符合 iiko 官方字段格式）
 */
export interface IikoMenuItem {
  id: string;                    // iiko 商品 ID
  name: string;                  // 商品名称
  description?: string;          // 商品描述
  price: number;                 // 售价（卢布）
  cost?: number;                 // 成本价（用于毛利分析）
  category: string;              // 分类
  imageUrl?: string;             // 图片 URL
  available: boolean;            // 是否可售
  modifiers?: IikoModifier[];    // 规格选项（温度、甜度、小料等）
}

/**
 * iiko 规格选项
 */
export interface IikoModifier {
  id: string;                    // 规格 ID
  name: string;                  // 规格名称
  type: 'temperature' | 'sweetness' | 'topping' | 'size';  // 规格类型
  options: IikoModifierOption[]; // 选项列表
  required: boolean;             // 是否必选
  maxQuantity?: number;          // 最大选择数量
}

/**
 * iiko 规格选项值
 */
export interface IikoModifierOption {
  id: string;                    // 选项 ID
  name: string;                  // 选项名称
  price: number;                 // 加价（卢布）
}

/**
 * iiko 订单创建请求
 */
export interface IikoCreateOrderRequest {
  storeId: string;               // 门店 ID
  customerId?: string;           // 客户 ID
  items: IikoOrderItem[];        // 订单项
  pickupCode: string;            // 提货码（T+4位）
  businessDate: string;          // 营业日（YYYY-MM-DD）
  orderType: 'pickup' | 'delivery';  // 订单类型
  paymentMethod: string;         // 支付方式
  totalAmount: number;           // 总金额
  discountAmount?: number;       // 折扣金额
  note?: string;                 // 订单备注
}

/**
 * iiko 订单项
 */
export interface IikoOrderItem {
  productId: string;             // 商品 ID
  productName: string;           // 商品名称
  quantity: number;              // 数量
  price: number;                 // 单价
  modifiers?: IikoOrderModifier[];  // 已选规格
}

/**
 * iiko 订单规格
 */
export interface IikoOrderModifier {
  modifierId: string;            // 规格 ID
  optionId: string;              // 选项 ID
  optionName: string;            // 选项名称
  quantity: number;              // 数量
  price: number;                 // 加价
}

/**
 * iiko 订单创建响应
 */
export interface IikoCreateOrderResponse {
  success: boolean;              // 是否成功
  orderId: string;               // iiko 订单 ID
  externalOrderId?: string;      // 外部订单 ID
  message?: string;              // 错误信息
}

/**
 * iiko 订单状态
 */
export enum IikoOrderStatus {
  PENDING = 'pending',           // 待制作
  PREPARING = 'preparing',       // 制作中
  READY = 'ready',               // 待取货
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
}

/**
 * iiko 订单状态查询响应
 */
export interface IikoOrderStatusResponse {
  orderId: string;               // iiko 订单 ID
  status: IikoOrderStatus;       // 订单状态
  pickupCode: string;            // 提货码
  updatedAt: Date;               // 更新时间
}

/**
 * iiko 销售数据同步请求
 */
export interface IikoSyncSalesRequest {
  storeId: string;               // 门店 ID
  businessDate: string;          // 营业日（YYYY-MM-DD）
  startTime: Date;               // 开始时间
  endTime: Date;                 // 结束时间
}

/**
 * iiko 销售数据同步响应
 */
export interface IikoSyncSalesResponse {
  success: boolean;              // 是否成功
  salesData: IikoSalesData[];    // 销售数据
  message?: string;              // 错误信息
}

/**
 * iiko 销售数据
 */
export interface IikoSalesData {
  orderId: string;               // 订单 ID
  storeId: string;               // 门店 ID
  businessDate: string;          // 营业日
  totalAmount: number;           // 总金额
  discountAmount: number;        // 折扣金额
  paymentMethod: string;         // 支付方式
  items: IikoOrderItem[];        // 订单项
  createdAt: Date;               // 创建时间
  completedAt?: Date;            // 完成时间
}

/**
 * IikoProvider 接口
 * 
 * 所有 iiko 相关操作的统一抽象层
 */
export interface IikoProvider {
  /**
   * 获取菜单数据
   * @param storeId 门店 ID
   * @returns 菜单列表
   */
  getMenu(storeId: string): Promise<IikoMenuItem[]>;

  /**
   * 创建订单
   * @param request 订单创建请求
   * @returns 订单创建响应
   */
  createOrder(request: IikoCreateOrderRequest): Promise<IikoCreateOrderResponse>;

  /**
   * 查询订单状态
   * @param orderId iiko 订单 ID
   * @returns 订单状态响应
   */
  getOrderStatus(orderId: string): Promise<IikoOrderStatusResponse>;

  /**
   * 同步销售数据
   * @param request 销售数据同步请求
   * @returns 销售数据同步响应
   */
  syncSales(request: IikoSyncSalesRequest): Promise<IikoSyncSalesResponse>;

  /**
   * 更新订单状态（用于 POS 确认）
   * @param orderId iiko 订单 ID
   * @param status 新状态
   * @returns 是否成功
   */
  updateOrderStatus(orderId: string, status: IikoOrderStatus): Promise<boolean>;
}
