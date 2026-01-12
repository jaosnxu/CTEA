import { useState } from "react";
import {
  ChevronLeft,
  CreditCard,
  Building2,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";

const WITHDRAW_METHODS = [
  {
    id: "bank",
    name: "Банковская карта",
    icon: CreditCard,
    desc: "1-3 рабочих дня",
    fee: 0,
    minAmount: 100,
  },
  {
    id: "sberbank",
    name: "Sberbank",
    icon: Building2,
    desc: "Мгновенно",
    fee: 2,
    minAmount: 100,
  },
  {
    id: "qiwi",
    name: "QIWI Wallet",
    icon: Wallet,
    desc: "Мгновенно",
    fee: 3,
    minAmount: 50,
  },
];

const QUICK_AMOUNTS = [100, 500, 1000, 1580]; // 最后一个是Все余额

export default function CommissionWithdraw() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState(WITHDRAW_METHODS[0].id);

  const availableBalance = 1580;
  const selectedMethodData = WITHDRAW_METHODS.find(
    m => m.id === selectedMethod
  );
  const withdrawAmount = parseFloat(amount) || 0;
  const fee = selectedMethodData
    ? (withdrawAmount * selectedMethodData.fee) / 100
    : 0;
  const actualAmount = withdrawAmount - fee;

  const handleWithdraw = () => {
    if (!amount || withdrawAmount <= 0) {
      toast.error("Введите сумму");
      return;
    }

    if (withdrawAmount < (selectedMethodData?.minAmount || 100)) {
      toast.error(
        `Минимальная сумма вывода ₽${formatCurrency(selectedMethodData?.minAmount)}`
      );
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error("Сумма вывода превышает доступный баланс");
      return;
    }

    toast.loading("Обработка заявки на вывод...", { duration: 2000 });
    setTimeout(() => {
      toast.success("Заявка на вывод отправлена!");
      setLocation("/commission");
    }, 2000);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-4 py-3 flex items-center sticky top-0 z-10 border-b border-gray-100">
          <Link href="/commission">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg ml-2">Вывод</h1>
        </header>

        {/* Available Balance */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="text-sm text-white/80 mb-2">可Вывод余额</div>
            <div className="text-4xl font-bold">₽{availableBalance}</div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-4">
            <label className="block text-sm font-semibold mb-3">
              Вывод金额
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                ₽
              </span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {QUICK_AMOUNTS.map(quickAmount => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(String(quickAmount))}
                  className="py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {quickAmount === availableBalance
                    ? "Все"
                    : `₽${formatCurrency(quickAmount)}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Withdraw Method */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-4">
            <label className="block text-sm font-semibold mb-3">
              Вывод方式
            </label>
            <div className="space-y-2">
              {WITHDRAW_METHODS.map(method => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon size={24} />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm mb-1">
                        {method.name}
                      </div>
                      <div className="text-xs text-gray-500">{method.desc}</div>
                    </div>

                    <div className="text-right">
                      {method.fee > 0 ? (
                        <div className="text-xs text-gray-500">
                          手续费 {method.fee}%
                        </div>
                      ) : (
                        <div className="text-xs text-green-600">免手续费</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        最低₽{method.minAmount}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        {withdrawAmount > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Вывод金额</span>
                  <span className="font-semibold">
                    ₽{withdrawAmount.toFixed(2)}
                  </span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>手续费 ({selectedMethodData?.fee}%)</span>
                    <span>-₽{fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-semibold">实际到账</span>
                  <span className="text-xl font-bold text-purple-600">
                    ₽{actualAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notice */}
        <div className="px-4 pb-4">
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
            <AlertCircle
              size={20}
              className="text-blue-600 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Вывод说明</p>
              <ul className="space-y-1 text-xs">
                <li>• 每日可Вывод3次，单次最低 ₽100</li>
                <li>• Банковская картаВывод1-3 рабочих дня</li>
                <li>• Электронный кошелёкВыводМгновенно</li>
                <li>• Вывод申请提交后不可撤销</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <Button
            onClick={handleWithdraw}
            disabled={
              !amount ||
              withdrawAmount <= 0 ||
              withdrawAmount > availableBalance
            }
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认Вывод
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
