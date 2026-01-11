/**
 * Call Screen - 叫号屏页面
 * 
 * 用途：门店电视大屏显示，实时显示待取货订单
 * 
 * 功能：
 * 1. 通过 WebSocket 实时接收Статус заказа变更
 * 2. 显示最新的待取货订单（提货码）
 * 3. 自动滚动显示多个订单
 * 4. 支持语音播报（可选）
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';
import { useWebSocket, OrderReadyEvent } from '@/hooks/useWebSocket';

interface ReadyOrder {
  pickupCode: string;
  pickupCodeSeries: 'T' | 'X';  // 提货码系列（T 系列：Для зала，X 系列：На вынос）
  storeName: string;
  items: string[];
  readyAt: Date;
}

export default function CallScreen() {
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [storeName, setStoreName] = useState('Красная площадь, Москва');

  // WebSocket 连接
  const ws = useWebSocket({ autoConnect: true });

  // 初始化：加入门店房间
  useEffect(() => {
    if (ws.isConnected) {
      // TODO: 从 URL 参数或配置获取 storeId
      const storeId = 'store-001';
      ws.joinStore(storeId);
      console.log('[CallScreen] 已加入门店房间:', storeId);
    }
  }, [ws.isConnected]);

  // 监听订单待取货事шт
  useEffect(() => {
    if (!ws.isConnected) return;

    const unsubscribe = ws.onOrderReady((event: OrderReadyEvent) => {
      console.log('[CallScreen] 收到新订单:', event);
      addReadyOrder({
        pickupCode: event.pickupCode,
        pickupCodeSeries: event.pickupCode.startsWith('T') ? 'T' : 'X',
        storeName: event.storeName,
        items: event.items,
        readyAt: new Date(event.readyAt),
      });
      playNotificationSound();
      speakPickupCode(event.pickupCode);
    });

    return unsubscribe;
  }, [ws.isConnected]);

  // 模拟数据（T 系列和 X 系列混合）
  useEffect(() => {
    setReadyOrders([
      {
        pickupCode: 'T1230',
        pickupCodeSeries: 'T',
        storeName: 'Красная площадь, Москва',
        items: ['Классический чай x2', 'Манго боба x1'],
        readyAt: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        pickupCode: 'X5678',
        pickupCodeSeries: 'X',
        storeName: 'Красная площадь, Москва',
        items: ['Матча латте x1', 'Клубничный шейк x2'],
        readyAt: new Date(Date.now() - 1 * 60 * 1000),
      },
      {
        pickupCode: 'T1231',
        pickupCodeSeries: 'T',
        storeName: 'Красная площадь, Москва',
        items: ['Тапиока чай x1'],
        readyAt: new Date(Date.now() - 30 * 1000),
      },
    ]);
  }, []);

  // 更新当前时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 添加新订单到列表
  const addReadyOrder = (order: ReadyOrder) => {
    setReadyOrders(prev => [order, ...prev].slice(0, 10)); // 最多显示 10 个订单
  };

  // 播放通知音效
  const playNotificationSound = () => {
    // TODO: 播放音效
    // const audio = new Audio('/sounds/notification.mp3');
    // audio.play();
  };

  // 语音播报
  const speakPickupCode = (pickupCode: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Заказ ${pickupCode} готов. Пожалуйста, заберите ваш заказ.`);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 计算等待时间
  const getWaitingTime = (readyAt: Date) => {
    const diff = Math.floor((new Date().getTime() - readyAt.getTime()) / 1000 / 60);
    if (diff < 1) return 'Только что';
    return `${diff} мин назад`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-primary/5 p-8">
      {/* 头部 */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-900">{storeName}</h1>
            <p className="text-xl text-gray-500 mt-2">CHUTEA 叫号系统</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {currentTime.toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 主显示区域 */}
      <div className="max-w-7xl mx-auto">
        {readyOrders.length === 0 ? (
          <Card className="p-24 text-center">
            <p className="text-3xl text-gray-400">暂无待取货订单</p>
            <p className="text-lg text-gray-400 mt-4">订单Готово后将在此显示</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* 最新订单（大卡片） */}
            <Card className={`p-12 text-white shadow-2xl animate-pulse-slow ${
              readyOrders[0].pickupCodeSeries === 'T'
                ? 'bg-gradient-to-r from-primary to-primary/80'
                : 'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold mb-4 flex items-center gap-3">
                    <Volume2 className="w-8 h-8" />
                    {readyOrders[0].pickupCodeSeries === 'T' ? 'Для зала - заберите заказ' : 'На вынос - заберите заказ'}
                  </div>
                  <div className="text-8xl font-bold tracking-wider mb-4">
                    {readyOrders[0].pickupCode}
                  </div>
                  <div className="text-xl opacity-90">
                    {readyOrders[0].items.join(' · ')}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-white text-lg px-6 py-2 mb-4" style={{
                    color: readyOrders[0].pickupCodeSeries === 'T' ? '#8b5cf6' : '#f97316'
                  }}>
                    {readyOrders[0].pickupCodeSeries === 'T' ? 'Серия T · Для зала' : 'Серия X · На вынос'}
                  </Badge>
                  <div className="text-xl opacity-90">
                    {getWaitingTime(readyOrders[0].readyAt)}
                  </div>
                </div>
              </div>
            </Card>

            {/* 其他待取货订单 */}
            {readyOrders.length > 1 && (
              <div className="grid grid-cols-2 gap-6">
                {readyOrders.slice(1, 5).map((order, index) => (
                  <Card key={index} className="p-8 hover:shadow-lg transition-shadow border-l-4" style={{
                    borderLeftColor: order.pickupCodeSeries === 'T' ? '#8b5cf6' : '#f97316'
                  }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-5xl font-bold tracking-wider" style={{
                          color: order.pickupCodeSeries === 'T' ? '#8b5cf6' : '#f97316'
                        }}>
                          {order.pickupCode}
                        </div>
                        <Badge variant="outline" className="text-xs" style={{
                          borderColor: order.pickupCodeSeries === 'T' ? '#8b5cf6' : '#f97316',
                          color: order.pickupCodeSeries === 'T' ? '#8b5cf6' : '#f97316'
                        }}>
                          {order.pickupCodeSeries === 'T' ? 'Для зала' : 'На вынос'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {getWaitingTime(order.readyAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items.join(' · ')}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* 更多订单（滚动列表） */}
            {readyOrders.length > 5 && (
              <Card className="p-6">
                <div className="text-lg font-semibold text-gray-700 mb-4">
                  其他待取货订单
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {readyOrders.slice(5, 10).map((order, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {order.pickupCode}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getWaitingTime(order.readyAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="max-w-7xl mx-auto mt-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between text-blue-800">
            <div>
              <strong>温馨提示：</strong> 请凭Код получения到柜台取餐，超过 10 мин未取将自动Отмена订单
            </div>
            <div className="text-sm opacity-75">
              WebSocket 实时连接 · 内测版
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
