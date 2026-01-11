import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, Gift, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEMBER_LEVELS } from "@/contexts/AppContext";

type MembershipLevel = keyof typeof MEMBER_LEVELS;

interface MembershipUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  newLevel: MembershipLevel;
}

export default function MembershipUpgradeModal({ 
  open, 
  onClose, 
  newLevel 
}: MembershipUpgradeModalProps) {
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    if (open) {
      // 延迟显示内容，创建动画效果
      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
    }
  }, [open]);

  if (!open) return null;

  const tier = MEMBER_LEVELS[newLevel];
  const discount = Math.round((1 - tier.discount) * 100);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className={`bg-white rounded-2xl w-full max-w-md overflow-hidden transform transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        {/* 顶部装饰 */}
        <div 
          className="h-32 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}CC 100%)` }}
        >
          {/* 动画光效 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-ping absolute h-20 w-20 rounded-full bg-white/30"></div>
            <div className="animate-pulse absolute h-16 w-16 rounded-full bg-white/40"></div>
            <Crown size={48} className="text-white relative z-10 animate-bounce" />
          </div>
          
          {/* 装饰元素 */}
          <Sparkles className="absolute top-4 left-4 text-white/60 animate-pulse" size={20} />
          <Sparkles className="absolute top-6 right-6 text-white/60 animate-pulse delay-75" size={16} />
          <Sparkles className="absolute bottom-4 left-8 text-white/60 animate-pulse delay-150" size={18} />
          <Sparkles className="absolute bottom-6 right-8 text-white/60 animate-pulse delay-100" size={14} />
        </div>

        {/* 内容区域 */}
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">恭喜升级！</h2>
          <p className="text-muted-foreground mb-6">
            您已成为 <span className="font-bold" style={{ color: tier.color }}>{tier.name}</span>
          </p>

          {/* 等级徽章 */}
          <div 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-6"
            style={{ backgroundColor: `${tier.color}15`, border: `2px solid ${tier.color}` }}
          >
            <Crown size={24} style={{ color: tier.color }} />
            <span className="font-bold text-lg" style={{ color: tier.color }}>
              {tier.name}
            </span>
          </div>

          {/* 权益列表 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold mb-3 flex items-center justify-center gap-2">
              <Gift size={16} className="text-primary" />
              专属权益
            </h3>
            <div className="space-y-2">
              {tier.benefits.map((benefit: string, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {benefit}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                全场消费享 {discount}折 优惠
              </div>
            </div>
          </div>

          {/* 赠送优惠券提示 */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-orange-800">
              🎁 升级礼包已发放至您的账户
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Эксклюзивный купон добавлен в «Мои купоны»
            </p>
          </div>

          {/* 关闭按钮 */}
          <Button
            onClick={onClose}
            className="w-full"
            style={{ backgroundColor: tier.color }}
          >
            开启尊享体验
          </Button>
        </div>
      </div>
    </div>
  );
}
