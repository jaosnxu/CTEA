/**
 * WebSocket Service - 实时叫号系统
 * 
 * 功能：
 * 1. 订单状态变更事件推送（POS 确认 → 叫号屏变号）
 * 2. 用户端订单状态实时同步
 * 3. 支持多门店隔离（通过 room 机制）
 * 4. 连接状态监控和日志记录
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * 订单状态变更事件
 */
export interface OrderStatusChangeEvent {
  orderId: string;
  pickupCode: string;
  storeId: string;
  storeName: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: string[];
  totalAmount: number;
  customerId?: string;
  timestamp: Date;
}

/**
 * WebSocket 服务类
 */
export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(httpServer: HTTPServer) {
    // 初始化 Socket.IO 服务器
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // 生产环境需要配置具体域名
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    console.log('[WebSocket] 服务器已启动');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] 客户端连接: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // 加入门店房间（用于多门店隔离）
      socket.on('join:store', (storeId: string) => {
        socket.join(`store:${storeId}`);
        console.log(`[WebSocket] 客户端 ${socket.id} 加入门店房间: ${storeId}`);
        socket.emit('joined:store', { storeId, success: true });
      });

      // 离开门店房间
      socket.on('leave:store', (storeId: string) => {
        socket.leave(`store:${storeId}`);
        console.log(`[WebSocket] 客户端 ${socket.id} 离开门店房间: ${storeId}`);
      });

      // 订阅用户订单更新（用户端）
      socket.on('subscribe:user', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`[WebSocket] 客户端 ${socket.id} 订阅用户订单: ${userId}`);
        socket.emit('subscribed:user', { userId, success: true });
      });

      // 取消订阅用户订单更新
      socket.on('unsubscribe:user', (userId: string) => {
        socket.leave(`user:${userId}`);
        console.log(`[WebSocket] 客户端 ${socket.id} 取消订阅用户订单: ${userId}`);
      });

      // 心跳检测
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // 断开连接
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] 客户端断开连接: ${socket.id}, 原因: ${reason}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * 推送订单状态变更（核心功能）
   * 
   * 触发场景：
   * 1. POS 后台点击"确认订单已好"
   * 2. iiko 插件监听到"确认好餐"事件
   * 3. 自动状态流转（超时取消等）
   */
  public emitOrderStatusChange(event: OrderStatusChangeEvent) {
    const { storeId, customerId, status, pickupCode } = event;

    console.log(`[WebSocket] 推送订单状态变更: ${event.orderId}, 状态: ${status}, 提货码: ${pickupCode}`);

    // 1. 推送到门店房间（叫号屏）
    this.io.to(`store:${storeId}`).emit('order:status:change', event);

    // 2. 推送到用户房间（用户端 TMA）
    if (customerId) {
      this.io.to(`user:${customerId}`).emit('order:status:change', event);
    }

    // 3. 特殊处理：订单待取货时，触发叫号屏显示
    if (status === 'ready') {
      this.io.to(`store:${storeId}`).emit('order:ready', {
        orderId: event.orderId,
        pickupCode: event.pickupCode,
        storeName: event.storeName,
        items: event.items,
        readyAt: event.timestamp,
      });

      console.log(`[WebSocket] 叫号屏显示: ${pickupCode}`);
    }

    // 4. 记录推送日志（用于后续分析）
    this.logEvent('order:status:change', event);
  }

  /**
   * 推送订单创建事件（用于 POS 后台实时显示新订单）
   */
  public emitOrderCreated(event: OrderStatusChangeEvent) {
    const { storeId } = event;

    console.log(`[WebSocket] 推送新订单: ${event.orderId}, 门店: ${storeId}`);

    // 推送到门店房间（POS 后台）
    this.io.to(`store:${storeId}`).emit('order:created', event);

    this.logEvent('order:created', event);
  }

  /**
   * 推送订单取消事件
   */
  public emitOrderCancelled(event: OrderStatusChangeEvent) {
    const { storeId, customerId } = event;

    console.log(`[WebSocket] 推送订单取消: ${event.orderId}`);

    // 推送到门店房间和用户房间
    this.io.to(`store:${storeId}`).emit('order:cancelled', event);
    if (customerId) {
      this.io.to(`user:${customerId}`).emit('order:cancelled', event);
    }

    this.logEvent('order:cancelled', event);
  }

  /**
   * 获取连接统计
   */
  public getStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
    };
  }

  /**
   * 记录事件日志
   */
  private logEvent(eventType: string, event: any) {
    // TODO: 写入数据库或日志文件
    // await db.insert(websocketLogs).values({
    //   eventType,
    //   eventData: JSON.stringify(event),
    //   timestamp: new Date(),
    // });
  }

  /**
   * 关闭 WebSocket 服务器
   */
  public close() {
    console.log('[WebSocket] 服务器关闭');
    this.io.close();
  }
}

/**
 * 全局 WebSocket 服务实例
 */
let wsService: WebSocketService | null = null;

/**
 * 初始化 WebSocket 服务
 */
export function initWebSocketService(httpServer: HTTPServer): WebSocketService {
  if (wsService) {
    console.warn('[WebSocket] 服务已初始化，跳过重复初始化');
    return wsService;
  }

  wsService = new WebSocketService(httpServer);
  return wsService;
}

/**
 * 获取 WebSocket 服务实例
 */
export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    throw new Error('[WebSocket] 服务未初始化，请先调用 initWebSocketService()');
  }
  return wsService;
}
