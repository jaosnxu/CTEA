/**
 * POS Simulator - 模拟收银后台
 *
 * 用途：在没有 iiko 插шт的情况下，手动闭环"提货核销"流程
 *
 * 功能：
 * 1. 显示ОжидаетПодтвердить заказ列表
 * 2. 点击"Подтвердить заказУже好"按钮 → 后端Статус机变更
 * 3. 触发 WebSocket → 叫号屏变号、用户 TMA 收到通知
 * 4. 验证叫号系统的实时性和稳定性
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";

interface Order {
  id: string;
  pickupCode: string;
  storeId: string;
  storeName: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  items: {
    name: string;
    quantity: number;
    specs: string;
  }[];
  totalAmount: number;
  createdAt: Date;
  customerName?: string;
}

export default function POSSimulator() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState("store-001");

  // 模拟门店列表
  const stores = [
    { id: "store-001", name: "Красная площадь, Москва" },
    { id: "store-002", name: "Санкт-Петербург, Нева" },
    { id: "store-003", name: "Казань, Кремль" },
  ];

  // 加载Список заказов
  const loadOrders = async () => {
    setLoading(true);
    try {
      // TODO: 调用后端 API 获取Список заказов
      // const response = await fetch(`/api/pos/orders?storeId=${selectedStore}&status=pending,preparing`);
      // const data = await response.json();
      // setOrders(data.orders);

      // 模拟数据（临时）
      setOrders([
        {
          id: "order-001",
          pickupCode: "T1234",
          storeId: "store-001",
          storeName: "Красная площадь, Москва",
          status: "pending",
          items: [
            {
              name: "Классический чай",
              quantity: 2,
              specs: "Холодный/Стандарт сахара/Тапиока/Большой",
            },
            {
              name: "Манго боба",
              quantity: 1,
              specs: "Холодный/Меньше сахара/Кокос/Средний",
            },
          ],
          totalAmount: 580,
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          customerName: "Иван Петров",
        },
        {
          id: "order-002",
          pickupCode: "T1235",
          storeId: "store-001",
          storeName: "Красная площадь, Москва",
          status: "preparing",
          items: [
            {
              name: "Матча латте",
              quantity: 1,
              specs: "Горячий/Половина/Пудинг/Большой",
            },
          ],
          totalAmount: 250,
          createdAt: new Date(Date.now() - 3 * 60 * 1000),
          customerName: "Мария Сидорова",
        },
      ]);
    } catch (error) {
      console.error("Ошибка загрузки заказов:", error);
    } finally {
      setLoading(false);
    }
  };

  // Подтвердить заказ（Ожидает приготовления → Готовится）
  const handleStartPreparing = async (orderId: string) => {
    try {
      // TODO: 调用后端 API 更新Статус заказа
      // await fetch(`/api/pos/orders/${orderId}/start`, { method: 'POST' });

      console.log(`[POS] Начать приготовление: ${orderId}`);

      // 更新本地Статус
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: "preparing" as const }
            : order
        )
      );
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
    }
  };

  // Подтвердить заказУже好（Готовится → Ожидает получения）
  const handleOrderReady = async (orderId: string, pickupCode: string) => {
    try {
      // TODO: 调用后端 API 更新Статус заказа
      // await fetch(`/api/pos/orders/${orderId}/ready`, { method: 'POST' });

      console.log(`[POS] Заказ завершён: ${orderId}, 提货: ${pickupCode}`);
      console.log(`[POS] WebSocket уведомление: 叫号屏显示 ${pickupCode}`);

      // 更新本地Статус
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: "ready" as const } : order
        )
      );

      // 模拟 WebSocket 推送（实际会由后端触发）
      // socket.emit('order:ready', { orderId, pickupCode });
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
    }
  };

  // Отмена订заказов
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Вы уверены, что хотите отменить этот заказ?")) {
      return;
    }

    try {
      // TODO: 调用后端 API Отмена订заказов
      // await fetch(`/api/pos/orders/${orderId}/cancel`, { method: 'POST' });

      console.log(`[POS] Заказ отменён: ${orderId}`);

      // 更新本地Статус
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error("Ошибка отмены:", error);
    }
  };

  // 获取Статус徽章
  const getStatusBadge = (status: Order["status"]) => {
    const statusMap = {
      pending: {
        label: "Ожидает приготовления",
        variant: "secondary" as const,
      },
      preparing: { label: "Готовится", variant: "default" as const },
      ready: { label: "Ожидает получения", variant: "default" as const },
      completed: { label: "Готово", variant: "outline" as const },
      cancelled: { label: "Отменён", variant: "destructive" as const },
    };

    const config = statusMap[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return "Только что";
    if (diff < 60) return `${diff} мин назад`;
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 初始加载
  useEffect(() => {
    loadOrders();

    // 每 10 秒自动Обновить
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [selectedStore]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 头部 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">模拟收银后台</h1>
            <p className="text-sm text-gray-500 mt-1">
              POS Simulator - 内测版订заказов管理
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* 门店选择 */}
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>

            {/* Обновить按钮 */}
            <Button
              onClick={loadOrders}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      {/* Список заказов */}
      <div className="max-w-7xl mx-auto grid gap-4">
        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">暂НетОжидает订заказов</p>
          </Card>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* 提货 */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      Код получения
                    </div>
                    <div className="text-3xl font-bold text-primary tracking-wider">
                      {order.pickupCode}
                    </div>
                  </div>

                  {/* 订заказов信息 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        订заказов #{order.id}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(order.createdAt)}
                      </span>
                      {order.customerName && (
                        <span>顾客: {order.customerName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Действия按钮 */}
                <div className="flex items-center gap-2">
                  {order.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleStartPreparing(order.id)}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Начать
                      </Button>
                      <Button
                        onClick={() => handleCancelOrder(order.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                    </>
                  )}

                  {order.status === "preparing" && (
                    <Button
                      onClick={() =>
                        handleOrderReady(order.id, order.pickupCode)
                      }
                      variant="default"
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Подтвердить заказУже好
                    </Button>
                  )}

                  {order.status === "ready" && (
                    <Badge
                      variant="default"
                      className="bg-green-600 text-white px-4 py-2"
                    >
                      等Ожидает顾客取货
                    </Badge>
                  )}
                </div>
              </div>

              {/* Товары */}
              <div className="border-t pt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  Товары
                </div>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 ml-2">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">{item.specs}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="font-semibold">Всего金额</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 提示信息 */}
      <div className="max-w-7xl mx-auto mt-8">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>内测模式说明：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Нажмите "Заказ готов" для отправки уведомления через WebSocket,
                номер заказа отобразится на экране
              </li>
              <li>用户端（TMA）会收到Статус заказа变更通知</li>
              <li>所有Действия都会记录到数据库，用于后续数据分析</li>
              <li>
                后期接入真实 iiko 环境后，此页面将由 iikoFront 插шт自动替代
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
