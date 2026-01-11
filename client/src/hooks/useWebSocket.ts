/**
 * useWebSocket Hook - WebSocket 客户端
 * 
 * 用途：
 * 1. 连接 WebSocket 服务器
 * 2. 订阅订单状态变更事件
 * 3. 自动重连和心跳检测
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
 * 订单待取货事件
 */
export interface OrderReadyEvent {
  orderId: string;
  pickupCode: string;
  storeName: string;
  items: string[];
  readyAt: Date;
}

/**
 * WebSocket Hook 配置
 */
interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectDelay?: number;
}

/**
 * WebSocket Hook
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = import.meta.env.VITE_WS_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnect = true,
    reconnectDelay = 3000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 连接 WebSocket
  const connect = () => {
    if (socketRef.current?.connected) {
      console.log('[WebSocket] 已连接，跳过重复连接');
      return;
    }

    console.log('[WebSocket] 连接中...');

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: reconnect,
      reconnectionDelay: reconnectDelay,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] 连接成功');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] 断开连接:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] 连接错误:', err);
      setError(err.message);
    });

    socketRef.current = socket;
  };

  // 断开连接
  const disconnect = () => {
    if (socketRef.current) {
      console.log('[WebSocket] 断开连接');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  // 加入门店房间（叫号屏、POS 后台）
  const joinStore = (storeId: string) => {
    if (!socketRef.current) {
      console.error('[WebSocket] 未连接，无法加入门店房间');
      return;
    }

    console.log('[WebSocket] 加入门店房间:', storeId);
    socketRef.current.emit('join:store', storeId);
  };

  // 离开门店房间
  const leaveStore = (storeId: string) => {
    if (!socketRef.current) return;

    console.log('[WebSocket] 离开门店房间:', storeId);
    socketRef.current.emit('leave:store', storeId);
  };

  // 订阅用户订单更新（用户端 TMA）
  const subscribeUser = (userId: string) => {
    if (!socketRef.current) {
      console.error('[WebSocket] 未连接，无法订阅用户订单');
      return;
    }

    console.log('[WebSocket] 订阅用户订单:', userId);
    socketRef.current.emit('subscribe:user', userId);
  };

  // 取消订阅用户订单更新
  const unsubscribeUser = (userId: string) => {
    if (!socketRef.current) return;

    console.log('[WebSocket] 取消订阅用户订单:', userId);
    socketRef.current.emit('unsubscribe:user', userId);
  };

  // 监听订单状态变更
  const onOrderStatusChange = (callback: (event: OrderStatusChangeEvent) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('order:status:change', callback);

    // 返回取消监听函数
    return () => {
      socketRef.current?.off('order:status:change', callback);
    };
  };

  // 监听订单待取货（叫号屏专用）
  const onOrderReady = (callback: (event: OrderReadyEvent) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('order:ready', callback);

    return () => {
      socketRef.current?.off('order:ready', callback);
    };
  };

  // 监听新订单创建（POS 后台专用）
  const onOrderCreated = (callback: (event: OrderStatusChangeEvent) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('order:created', callback);

    return () => {
      socketRef.current?.off('order:created', callback);
    };
  };

  // 监听订单取消
  const onOrderCancelled = (callback: (event: OrderStatusChangeEvent) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('order:cancelled', callback);

    return () => {
      socketRef.current?.off('order:cancelled', callback);
    };
  };

  // 心跳检测
  useEffect(() => {
    if (!isConnected || !socketRef.current) return;

    const interval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 30000); // 每 30 秒发送一次心跳

    return () => clearInterval(interval);
  }, [isConnected]);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    joinStore,
    leaveStore,
    subscribeUser,
    unsubscribeUser,
    onOrderStatusChange,
    onOrderReady,
    onOrderCreated,
    onOrderCancelled,
  };
}
