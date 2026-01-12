import { useState } from "react";
import { ArrowLeft, CreditCard, Plus, Trash2, Check } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Payment() {
  const { t } = useLanguage();
  const [cards, setCards] = useState([
    { id: 1, type: "Visa", last4: "4242", expiry: "12/25", isDefault: true },
    {
      id: 2,
      type: "Mastercard",
      last4: "8888",
      expiry: "09/26",
      isDefault: false,
    },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCard, setNewCard] = useState({ number: "", expiry: "", cvc: "" });

  const handleAddCard = () => {
    if (newCard.number.length < 16 || !newCard.expiry || !newCard.cvc) {
      toast.error("Заполните все данные карты");
      return;
    }

    setCards([
      ...cards,
      {
        id: Date.now(),
        type: "Visa", // Mock detection
        last4: newCard.number.slice(-4),
        expiry: newCard.expiry,
        isDefault: false,
      },
    ]);
    setIsAdding(false);
    setNewCard({ number: "", expiry: "", cvc: "" });
    toast.success("Успешно добавлено");
  };

  const setDefault = (id: number) => {
    setCards(cards.map(c => ({ ...c, isDefault: c.id === id })));
    toast.success("Установлен как способ оплаты по умолчанию");
  };

  const removeCard = (id: number) => {
    setCards(cards.filter(c => c.id !== id));
    toast.success("Карта удалена");
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/profile">
            <ArrowLeft size={24} className="text-foreground cursor-pointer" />
          </Link>
          <h1 className="font-bold text-lg">Способ оплаты</h1>
        </div>

        <div className="p-4 space-y-4">
          {cards.map(card => (
            <div
              key={card.id}
              className={cn(
                "bg-white rounded-xl p-5 shadow-sm border-2 transition-all relative overflow-hidden",
                card.isDefault ? "border-primary" : "border-transparent"
              )}
              onClick={() => setDefault(card.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {card.type}
                  </div>
                  <span className="font-mono font-bold text-lg">
                    •••• {card.last4}
                  </span>
                </div>
                {card.isDefault && (
                  <div className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    默认
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    有效期
                  </p>
                  <p className="font-mono text-sm font-medium">{card.expiry}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50 h-8 w-8"
                  onClick={e => {
                    e.stopPropagation();
                    removeCard(card.id);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 rounded-xl border-dashed border-2 border-gray-300 bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 shadow-none">
                <Plus size={20} className="mr-2" /> 添加新卡片
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90%] rounded-2xl">
              <DialogHeader>
                <DialogTitle>添加Банковская карта</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">卡号</label>
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={newCard.number}
                    onChange={e =>
                      setNewCard({ ...newCard, number: e.target.value })
                    }
                    maxLength={19}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">有效期</label>
                    <Input
                      placeholder="MM/YY"
                      value={newCard.expiry}
                      onChange={e =>
                        setNewCard({ ...newCard, expiry: e.target.value })
                      }
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2 w-24">
                    <label className="text-sm font-medium">CVC</label>
                    <Input
                      placeholder="123"
                      value={newCard.cvc}
                      onChange={e =>
                        setNewCard({ ...newCard, cvc: e.target.value })
                      }
                      maxLength={3}
                    />
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={handleAddCard}>
                  Подтвердить添加
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MobileLayout>
  );
}
