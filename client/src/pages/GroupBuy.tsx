import { useState } from "react";
import { ChevronLeft, Users, Clock, Share2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";
import ShareModal from "@/components/ShareModal";
import { formatCurrency } from "@/lib/i18n";

// 模拟Групповая покупкаТовары数据
const GROUP_BUY_PRODUCTS = [
  {
    id: "gb_1",
    name: "CHUTEA Лимитированный термос",
    image: "/images/mall/cup_01.png",
    originalPrice: 299,
    groupPrice: 199,
    discount: 100,
    minPeople: 3,
    currentGroups: [
      { id: "g1", leader: "Anna K.", avatar: "👩", current: 2, needed: 1, timeLeft: 3600 },
      { id: "g2", leader: "Dmitry V.", avatar: "👨", current: 1, needed: 2, timeLeft: 7200 }
    ],
    sold: 1240,
    stock: 500
  },
  {
    id: "gb_2",
    name: "CHUTEA Фирменная футболка",
    image: "/images/mall/tshirt_01.png",
    originalPrice: 199,
    groupPrice: 129,
    discount: 70,
    minPeople: 5,
    currentGroups: [
      { id: "g3", leader: "Elena S.", avatar: "👩‍🦰", current: 4, needed: 1, timeLeft: 1800 },
      { id: "g4", leader: "Ivan P.", avatar: "👨‍💼", current: 3, needed: 2, timeLeft: 5400 }
    ],
    sold: 856,
    stock: 300
  },
  {
    id: "gb_3",
    name: "CHUTEA Подарочный набор",
    image: "/images/mall/giftbox_01.png",
    originalPrice: 499,
    groupPrice: 349,
    discount: 150,
    minPeople: 2,
    currentGroups: [
      { id: "g5", leader: "Maria L.", avatar: "👩‍💻", current: 1, needed: 1, timeLeft: 10800 }
    ],
    sold: 624,
    stock: 200
  }
];

export default function GroupBuy() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [shareProduct, setShareProduct] = useState<typeof GROUP_BUY_PRODUCTS[0] | null>(null);
  
  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes}мин`;
  };
  
  const handleJoinGroup = (productId: string, groupId: string) => {
    // 实际应跳转到Оплата页面
    alert(`加入Групповая покупка: ${productId} - ${groupId}`);
  };
  
  const handleStartGroup = (productId: string) => {
    // 实际应跳转到Оплата页面并创建新Групповая покупка
    alert(`发起Групповая покупка: ${productId}`);
  };
  
  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-4 py-3 flex items-center sticky top-0 z-10 border-b border-gray-100">
          <Link href="/mall">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg ml-2">Групповая покупка购买</h1>
        </header>
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Users size={28} />
            <h2 className="text-2xl font-bold">Групповая покупка特惠</h2>
          </div>
          <p className="text-sm text-white/90">Пригласить друзей一起拼，享受超低团购价</p>
        </div>
        
        {/* Products List */}
        <div className="p-4 space-y-4">
          {GROUP_BUY_PRODUCTS.map((product) => (
            <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Product Info */}
              <div className="p-4 flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-pink-600">₽{product.groupPrice}</span>
                    <span className="text-sm text-gray-400 line-through">₽{product.originalPrice}</span>
                    <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full">
                      省₽{product.discount}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{product.minPeople}человек</span>
                    <span>Уже拼{product.sold}шт</span>
                  </div>
                </div>
              </div>
              
              {/* Current Groups */}
              <div className="px-4 pb-4">
                <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                  <Users size={14} />
                  <span>正在进行的Групповая покупка</span>
                </div>
                
                <div className="space-y-2">
                  {product.currentGroups.map((group) => (
                    <div key={group.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                      <div className="text-3xl">{group.avatar}</div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">{group.leader} 的Групповая покупка</div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Осталось {group.needed} человек</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTimeLeft(group.timeLeft)}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleJoinGroup(product.id, group.id)}
                        className="bg-pink-600 hover:bg-pink-700 text-white rounded-full px-4"
                      >
                        去Групповая покупка
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <Button
                  onClick={() => handleStartGroup(product.id)}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full"
                >
                  <Users size={18} className="mr-1" />
                  发起Групповая покупка
                </Button>
                <Button
                  onClick={() => setShareProduct(product)}
                  variant="outline"
                  className="border-pink-600 text-pink-600 hover:bg-pink-50 rounded-full px-4"
                >
                  <Share2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Rules Section */}
        <div className="p-4">
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold mb-3">Групповая покупка规则</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Групповая покупка成功后，所有参与者均可享受团购价</p>
              <p>• Групповая покупка失败将自动退款至原Оплата账户</p>
              <p>• 每个用户每天最多可参与3个Групповая покупка</p>
              <p>• Групповая покупка有效期为24ч，超时自动退款</p>
            </div>
          </div>
        </div>
        
        {/* Share Modal */}
        <ShareModal
          open={!!shareProduct}
          onClose={() => setShareProduct(null)}
          title={shareProduct ? `Поделиться групповой покупкой: ${shareProduct.name}` : ""}
          shareUrl={shareProduct ? `https://chutea.app/group-buy/${shareProduct.id}` : ""}
          description={shareProduct ? `Всего ₽${formatCurrency(shareProduct.groupPrice)}, было ₽${formatCurrency(shareProduct.originalPrice)}, присоединяйтесь к групповой покупке!` : ""}
        />
      </div>
    </MobileLayout>
  );
}
