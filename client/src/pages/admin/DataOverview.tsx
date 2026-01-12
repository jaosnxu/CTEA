/**
 * 管理后端数据概览页面
 *
 * 功能：
 * 1. 展示海参崴凌晨 02:30 订заказов数据
 * 2. 展示营业День归类逻辑（前一营业День）
 * 3. 展示多时区Статистика заказов
 * 4. 展示Правила расчёта рабочего дня
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";

export default function DataOverview() {
  // 模拟海参崴凌晨 02:30 订заказов数据
  const vladivostokOrder = {
    orderId: "order-vladivostok-001",
    pickupCode: "T8888",
    storeId: "store-vladivostok-001",
    storeName: "Владивосток, Набережная",
    timezone: "Asia/Vladivostok",
    utcOffset: 10,
    orderTime: "2026-01-11T02:30:00+10:00",
    orderTimeLocal: "2026г.1Месяц11День 02:30:00",
    businessDate: "2026-01-10",
    items: ["Классический чай x1", "Тапиока чай x1"],
    totalAmount: 380,
    status: "completed",
  };

  // Правила расчёта рабочего дня
  const businessDateRule = {
    title: "Правила расчёта рабочего дня",
    description: "Заказы с 00:00 до 04:00 относятся к предыдущему рабочему дню",
    examples: [
      {
        time: "2026-01-11 00:30",
        businessDate: "2026-01-10",
        reason: "00:30 < 04:00, относится к предыдущему дню",
      },
      {
        time: "2026-01-11 02:30",
        businessDate: "2026-01-10",
        reason: "02:30 < 04:00, относится к предыдущему дню",
      },
      {
        time: "2026-01-11 04:00",
        businessDate: "2026-01-11",
        reason: "04:00 >= 04:00, относится к текущему дню",
      },
      {
        time: "2026-01-11 10:00",
        businessDate: "2026-01-11",
        reason: "10:00 >= 04:00, относится к текущему дню",
      },
    ],
  };

  // 多时区Статистика заказов
  const timezoneStats = [
    {
      timezone: "Europe/Moscow",
      utcOffset: 3,
      storeName: "Красная площадь, Москва",
      orderCount: 120,
      revenue: 36000,
    },
    {
      timezone: "Asia/Vladivostok",
      utcOffset: 10,
      storeName: "Владивосток, Набережная",
      orderCount: 45,
      revenue: 13500,
    },
    {
      timezone: "Asia/Yekaterinburg",
      utcOffset: 5,
      storeName: "Екатеринбург, Центр",
      orderCount: 80,
      revenue: 24000,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">管理后端数据概览</h1>
          <p className="text-gray-500 mt-2">
            多时区订заказов数据和营业День归类验证
          </p>
        </div>

        {/* 海参崴凌晨 02:30 订заказов数据 */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              海参崴凌晨 02:30 订заказов数据
            </h2>
            <Badge className="bg-green-600 text-white">Готово</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 订заказов信息 */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">
                    {vladivostokOrder.storeName}
                  </div>
                  <div className="text-sm text-gray-500">
                    时区: {vladivostokOrder.timezone} (UTC+
                    {vladivostokOrder.utcOffset})
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">
                    Время заказа（本地）
                  </div>
                  <div className="text-sm text-gray-500">
                    {vladivostokOrder.orderTimeLocal}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    UTC: {vladivostokOrder.orderTime}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">
                    营业День归属
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {vladivostokOrder.businessDate}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ✓ 凌晨 02:30 &lt; 04:00，归属前一营业День
                  </div>
                </div>
              </div>
            </div>

            {/* Детали заказа */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">订заказов编号</span>
                  <span className="font-semibold">
                    {vladivostokOrder.orderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">提货码</span>
                  <span className="font-semibold text-primary">
                    {vladivostokOrder.pickupCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Товары</span>
                  <span className="font-semibold">
                    {vladivostokOrder.items.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Сумма заказа</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(vladivostokOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Статус заказа</span>
                  <Badge className="bg-green-600 text-white">Готово</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 营业День计算说明 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900 mb-2">
                  营业День计算逻辑
                </div>
                <div className="text-sm text-blue-700">
                  该订заказовВремя заказа为{" "}
                  <strong>2026г.1Месяц11День 02:30:00</strong>（本地时间），
                  由于凌晨 02:30 &lt; 04:00，系统自动将该订заказов归类到{" "}
                  <strong>前一营业День（2026-01-10）</strong>。
                  这确保了财务报表的准确性，符合餐饮行业的营业День计算惯例。
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Правила расчёта рабочего дня */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {businessDateRule.title}
          </h2>
          <p className="text-gray-600 mb-4">{businessDateRule.description}</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Время заказа
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    营业День归属
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    计算原因
                  </th>
                </tr>
              </thead>
              <tbody>
                {businessDateRule.examples.map((example, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">{example.time}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          example.businessDate === "2026-01-10"
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 text-white"
                        }
                      >
                        {example.businessDate}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {example.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 多时区Статистика заказов */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            多时区Статистика заказов（营业День: 2026-01-10）
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timezoneStats.map((stat, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">
                    {stat.storeName}
                  </div>
                  <Badge variant="outline">UTC+{stat.utcOffset}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">订заказов数</span>
                    <span className="font-semibold">{stat.orderCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">营收</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(stat.revenue.toLocaleString())}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    时区: {stat.timezone}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  Всего订заказов数
                </div>
                <div className="text-2xl font-bold text-primary">
                  {timezoneStats.reduce(
                    (sum, stat) => sum + stat.orderCount,
                    0
                  )}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Всего营收</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    timezoneStats
                      .reduce((sum, stat) => sum + stat.revenue, 0)
                      .toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
