import { useState } from "react";
import {
  ChevronLeft,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";

// 模拟佣金数据
const COMMISSION_DATA = {
  totalEarnings: 3240,
  availableBalance: 1580,
  pendingBalance: 860,
  withdrawnTotal: 800,
  currentLevel: "Золотой инфлюенсер",
  commissionRate: 15,
  totalReferrals: 87,
  activeReferrals: 56,
};

// 佣金记录
const COMMISSION_RECORDS = [
  {
    id: "c1",
    type: "order",
    from: "Anna K.",
    amount: 45,
    orderAmount: 300,
    status: "settled",
    date: "2026-01-09 14:23",
    product: "Air Force 1 'Tea Leaf' Коллаб",
  },
  {
    id: "c2",
    type: "referral",
    from: "Dmitry V.",
    amount: 50,
    status: "settled",
    date: "2026-01-08 10:15",
    note: "Бонус за регистрацию нового пользователя",
  },
  {
    id: "c3",
    type: "order",
    from: "Elena S.",
    amount: 38,
    orderAmount: 250,
    status: "pending",
    date: "2026-01-08 09:30",
    product: "CHUTEA Лимитированный термос",
  },
  {
    id: "c4",
    type: "order",
    from: "Ivan P.",
    amount: 67,
    orderAmount: 450,
    status: "settled",
    date: "2026-01-07 16:45",
    product: "CHUTEA Подарочный набор",
  },
  {
    id: "c5",
    type: "referral",
    from: "Maria L.",
    amount: 50,
    status: "settled",
    date: "2026-01-06 11:20",
    note: "Бонус за регистрацию нового пользователя",
  },
  {
    id: "c6",
    type: "order",
    from: "Alexey N.",
    amount: 29,
    orderAmount: 199,
    status: "settled",
    date: "2026-01-05 13:10",
    product: "CHUTEA Фирменная футболка",
  },
];

export default function Commission() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "order" | "referral">("all");

  const filteredRecords =
    filter === "all"
      ? COMMISSION_RECORDS
      : COMMISSION_RECORDS.filter(r => r.type === filter);

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-4 py-3 flex items-center sticky top-0 z-10 border-b border-gray-100">
          <Link href="/influencer">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg ml-2">我的佣金</h1>
        </header>

        {/* Balance Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-white/80 mb-1">累计收益</div>
                <div className="text-4xl font-bold">
                  ₽{COMMISSION_DATA.totalEarnings}
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <TrendingUp size={32} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-xs text-white/70 mb-1">可Вывод</div>
                <div className="text-lg font-bold">
                  ₽{COMMISSION_DATA.availableBalance}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">待结算</div>
                <div className="text-lg font-bold">
                  ₽{COMMISSION_DATA.pendingBalance}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">已Вывод</div>
                <div className="text-lg font-bold">
                  ₽{COMMISSION_DATA.withdrawnTotal}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setLocation("/commission/withdraw")}
              className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold rounded-xl py-6"
            >
              <DollarSign size={20} className="mr-2" />
              立即Вывод
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {COMMISSION_DATA.currentLevel}
              </div>
              <div className="text-xs text-gray-500">当前等级</div>
            </div>
            <div className="text-center border-l border-r border-gray-100">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {COMMISSION_DATA.commissionRate}%
              </div>
              <div className="text-xs text-gray-500">佣金比例</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {COMMISSION_DATA.totalReferrals}
              </div>
              <div className="text-xs text-gray-500">累计推广</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "all" ? "bg-purple-600 text-white" : "text-gray-600"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilter("order")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "order"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600"
              }`}
            >
              Комиссия за заказ
            </button>
            <button
              onClick={() => setFilter("referral")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "referral"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600"
              }`}
            >
              Реферальный бонус
            </button>
          </div>
        </div>

        {/* Commission Records */}
        <div className="px-4 pb-4 space-y-3">
          {filteredRecords.map(record => (
            <div key={record.id} className="bg-white rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{record.from}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        record.type === "order"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {record.type === "order"
                        ? "Комиссия за заказ"
                        : "Реферальный бонус"}
                    </span>
                  </div>

                  {record.product && (
                    <div className="text-sm text-gray-600 mb-1">
                      {record.product}
                    </div>
                  )}
                  {record.note && (
                    <div className="text-sm text-gray-600 mb-1">
                      {record.note}
                    </div>
                  )}
                  {record.orderAmount && (
                    <div className="text-xs text-gray-500">
                      Сумма заказа: ₽{record.orderAmount}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    +₽{record.amount}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      record.status === "settled"
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {record.status === "settled" ? "Выплачено" : "Ожидает"}
                  </div>
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                <Calendar size={12} className="mr-1" />
                {record.date}
              </div>
            </div>
          ))}
        </div>

        {/* Commission Rules */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold mb-3">佣金说明</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                • Комиссия за заказ：推广订单成交后获得{" "}
                {COMMISSION_DATA.commissionRate}% 佣金
              </p>
              <p>
                • Реферальный бонус：邀请新用户注册并Готово首单，获得 ₽50 奖励
              </p>
              <p>• 结算周期：订单Готово后7天自动结算</p>
              <p>• Вывод规则：单次最低Вывод ₽100，每日可Вывод3次</p>
              <p>• 等级制度：根据推广业绩提升等级，享受更高佣金比例</p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
