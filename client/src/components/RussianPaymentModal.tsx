import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, CreditCard, Building2, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RussianPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onPaymentSelect: (method: string) => void;
}

const PAYMENT_METHODS = [
  {
    id: "yookassa",
    name: "YooKassa",
    icon: CreditCard,
    desc: "Банковская карта, электронный кошелёк",
    popular: true,
  },
  {
    id: "sberbank",
    name: "Sberbank",
    icon: Building2,
    desc: "Сбербанк России",
    popular: true,
  },
  {
    id: "tinkoff",
    name: "Tinkoff",
    icon: CreditCard,
    desc: "Карта Тинькофф",
    popular: false,
  },
  {
    id: "qiwi",
    name: "QIWI Wallet",
    icon: Wallet,
    desc: "Оплата электронным кошельком",
    popular: false,
  },
  {
    id: "sbp",
    name: "СБП",
    icon: Smartphone,
    desc: "Система быстрых платежей",
    popular: true,
  },
];

export default function RussianPaymentModal({
  isOpen,
  onClose,
  amount,
  onPaymentSelect,
}: RussianPaymentModalProps) {
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedMethod) {
      onPaymentSelect(selectedMethod);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">选择支付方式</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Amount */}
        <div className="px-4 py-4 bg-gradient-to-r from-teal-50 to-blue-50">
          <div className="text-sm text-gray-600 mb-1">支付金额</div>
          <div className="text-3xl font-bold text-teal-600">
            ₽{amount.toFixed(2)}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PAYMENT_METHODS.map(method => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                  isSelected
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                    isSelected
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  <Icon size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{method.name}</span>
                    {method.popular && (
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                        热门
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{method.desc}</p>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path
                        d="M1 5L5 9L13 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleConfirm}
            disabled={!selectedMethod}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认支付 ₽{amount.toFixed(2)}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            支付过程安全加密，保护您的资金安全
          </p>
        </div>
      </div>
    </div>
  );
}
