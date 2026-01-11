import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Gift, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";

export default function GiftCardClaim() {
  const { t } = useLanguage();
  const [, params] = useRoute("/gift-card/claim/:code");
  const [, setLocation] = useLocation();
  const { userProfile } = useApp();
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "claimed">("loading");
  const [giftCard, setGiftCard] = useState<{
    code: string;
    amount: number;
    from: string;
    message: string;
    expiryDate: string;
  } | null>(null);
  
  useEffect(() => {
    // 模拟验证礼品卡
    const verifyGiftCard = async () => {
      setStatus("loading");
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟礼品卡数据
      const mockGiftCard = {
        code: params?.code || "",
        amount: 500,
        from: "Anna K.",
        message: "С днём рождения! Наслаждайтесь вкусным чаем CHUTEA 🎉",
        expiryDate: "2026-12-31"
      };
      
      setGiftCard(mockGiftCard);
      setStatus("valid");
    };
    
    if (params?.code) {
      verifyGiftCard();
    }
  }, [params?.code]);
  
  const handleClaim = async () => {
    if (!userProfile) {
      toast.error("Сначала войдите в систему");
      setLocation("/profile");
      return;
    }
    
    setStatus("loading");
    
    // 模拟ПолучитьAPI调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setStatus("claimed");
    toast.success(`Успешно получена подарочная карта на ₽${formatCurrency(giftCard?.amount)}!`);
    
    // 3秒后跳转到礼品卡页面
    setTimeout(() => {
      setLocation("/gift-cards");
    }, 3000);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {status === "loading" && (
          <div className="p-12 text-center">
            <Loader2 size={48} className="mx-auto text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600">正在验证礼品卡...</p>
          </div>
        )}
        
        {status === "valid" && giftCard && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Gift size={40} />
              </div>
              <h1 className="text-2xl font-bold mb-2">收到一张礼品卡</h1>
              <p className="text-sm text-white/90">来自 {giftCard.from}</p>
            </div>
            
            {/* Content */}
            <div className="p-8">
              {/* Amount */}
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                  ₽{giftCard.amount}
                </div>
                <p className="text-sm text-gray-500">礼品卡面额</p>
              </div>
              
              {/* Message */}
              {giftCard.message && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-700 text-center italic">
                    "{giftCard.message}"
                  </p>
                </div>
              )}
              
              {/* Details */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">礼品卡编号</span>
                  <span className="font-mono font-semibold">{giftCard.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">有效期至</span>
                  <span className="font-semibold">{giftCard.expiryDate}</span>
                </div>
              </div>
              
              {/* Action Button */}
              <Button
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-6 rounded-xl text-lg font-bold"
              >
                立即Получить
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Получить后将自动添加到您的账户
              </p>
            </div>
          </>
        )}
        
        {status === "claimed" && giftCard && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Получить成功！</h2>
            <p className="text-gray-600 mb-6">
              ₽{giftCard.amount} 已添加到您的账户
            </p>
            <p className="text-sm text-gray-500">
              正在跳转到礼品卡页面...
            </p>
          </div>
        )}
        
        {status === "invalid" && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={40} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">礼品卡Нет效</h2>
            <p className="text-gray-600 mb-6">
              该礼品卡可能已被Получить或已过期
            </p>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-gray-300"
            >
              返回首页
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
