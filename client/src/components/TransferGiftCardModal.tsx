import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/i18n";

interface TransferGiftCardModalProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
  cardCode: string;
  balance: number;
  onTransfer: (to: string, message: string) => void;
}

export default function TransferGiftCardModal({
  open,
  onClose,
  cardId,
  cardCode,
  balance,
  onTransfer,
}: TransferGiftCardModalProps) {
  const { t } = useLanguage();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!recipientPhone || recipientPhone.length !== 11) {
      alert("请输入正确的手机号");
      return;
    }

    onTransfer(recipientPhone, message);
    setRecipientPhone("");
    setMessage("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">转送礼品卡</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 礼品卡信息 */}
          <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">卡号</span>
              <span className="text-sm font-mono">{cardCode}</span>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(balance.toFixed(2))}
            </div>
            <div className="text-sm opacity-90 mt-1">当前余额</div>
          </div>

          {/* 接收方手机号 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              接收方手机号 <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              placeholder="Введите номер телефона получателя"
              value={recipientPhone}
              onChange={e => setRecipientPhone(e.target.value)}
              maxLength={11}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              礼品卡将转送至该手机号绑定的账户
            </p>
          </div>

          {/* 转送留言 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              转送留言（选填）
            </label>
            <Textarea
              placeholder="Напишите пожелание или сообщение..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              maxLength={200}
              className="w-full resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>让礼物更有温度</span>
              <span>{message.length}/200</span>
            </div>
          </div>

          {/* 温馨提示 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-orange-800 mb-2">
              温馨提示
            </h3>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• 转送后礼品卡将立即从您的账户移除</li>
              <li>
                • Получатель увидит карту в разделе «Мои подарочные карты»
              </li>
              <li>• 转送操作不可撤销，请确认接收方信息</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-primary hover:bg-primary/90 text-white"
            disabled={!recipientPhone || recipientPhone.length !== 11}
          >
            <Send size={16} className="mr-2" />
            确认转送
          </Button>
        </div>
      </div>
    </div>
  );
}
