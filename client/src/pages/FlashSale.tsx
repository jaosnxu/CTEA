import { useState, useEffect } from "react";
import { ChevronLeft, Zap, Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";

// 秒杀场次
const FLASH_SALE_SESSIONS = [
  { id: "10am", time: "10:00", label: "Утренняя сессия", startHour: 10 },
  { id: "2pm", time: "14:00", label: "Дневная сессия", startHour: 14 },
  { id: "8pm", time: "20:00", label: "Вечерняя сессия", startHour: 20 },
];

// 模拟秒杀Товары数据
const FLASH_SALE_PRODUCTS = [
  {
    id: "fs_1",
    name: "CHUTEA Лимитированный термос",
    image: "/images/mall/cup_01.png",
    originalPrice: 299,
    flashPrice: 99,
    discount: 67,
    stock: 100,
    sold: 87,
    session: "10am",
  },
  {
    id: "fs_2",
    name: "CHUTEA Фирменная футболка",
    image: "/images/mall/tshirt_01.png",
    originalPrice: 199,
    flashPrice: 79,
    discount: 60,
    stock: 200,
    sold: 156,
    session: "10am",
  },
  {
    id: "fs_3",
    name: "CHUTEA Подарочный набор",
    image: "/images/mall/giftbox_01.png",
    originalPrice: 499,
    flashPrice: 199,
    discount: 60,
    stock: 50,
    sold: 48,
    session: "2pm",
  },
  {
    id: "fs_4",
    name: "CHUTEA Сумка",
    image: "/images/mall/bag_01.png",
    originalPrice: 159,
    flashPrice: 59,
    discount: 63,
    stock: 150,
    sold: 89,
    session: "2pm",
  },
  {
    id: "fs_5",
    name: "CHUTEA Набор кружек",
    image: "/images/mall/mug_set.png",
    originalPrice: 249,
    flashPrice: 99,
    discount: 60,
    stock: 80,
    sold: 12,
    session: "8pm",
  },
];

// 倒计时组шт
function Countdown({ targetHour }: { targetHour: number }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [status, setStatus] = useState<"upcoming" | "active" | "ended">(
    "upcoming"
  );

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentHour = now.getHours();

      // 计算目标时间
      let target = new Date();
      target.setHours(targetHour, 0, 0, 0);

      // 如果目标时间已过，设置为明天
      if (currentHour >= targetHour) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setStatus("active");
        // 秒杀进行中，显示结束倒计时（假设持续2ч）
        const endTime = new Date(target);
        endTime.setHours(endTime.getHours() + 2);
        const endDiff = endTime.getTime() - now.getTime();

        if (endDiff <= 0) {
          setStatus("ended");
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        } else {
          const hours = Math.floor(endDiff / (1000 * 60 * 60));
          const minutes = Math.floor(
            (endDiff % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((endDiff % (1000 * 60)) / 1000);
          setTimeLeft({ hours, minutes, seconds });
        }
      } else {
        setStatus("upcoming");
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetHour]);

  const formatNumber = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="flex items-center gap-2">
      {status === "upcoming" && (
        <>
          <Clock size={16} className="text-orange-600" />
          <span className="text-sm text-gray-600">距开始</span>
        </>
      )}
      {status === "active" && (
        <>
          <Zap size={16} className="text-red-600" />
          <span className="text-sm text-red-600 font-semibold">抢购中</span>
        </>
      )}
      {status === "ended" && (
        <span className="text-sm text-gray-400">已结束</span>
      )}

      {status !== "ended" && (
        <div className="flex items-center gap-1">
          <div className="bg-gray-900 text-white text-xs px-1.5 py-1 rounded font-mono">
            {formatNumber(timeLeft.hours)}
          </div>
          <span className="text-xs">:</span>
          <div className="bg-gray-900 text-white text-xs px-1.5 py-1 rounded font-mono">
            {formatNumber(timeLeft.minutes)}
          </div>
          <span className="text-xs">:</span>
          <div className="bg-gray-900 text-white text-xs px-1.5 py-1 rounded font-mono">
            {formatNumber(timeLeft.seconds)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlashSale() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState(
    FLASH_SALE_SESSIONS[0].id
  );

  const currentProducts = FLASH_SALE_PRODUCTS.filter(
    p => p.session === selectedSession
  );

  const handleBuy = (productId: string) => {
    // toast.success("已В корзину！");
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 flex items-center sticky top-0 z-10">
          <Link href="/mall">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 text-white hover:bg-white/20"
            >
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg ml-2 text-white">限时秒杀</h1>
        </header>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-4 pb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={28} />
            <h2 className="text-2xl font-bold">每日秒杀</h2>
          </div>
          <p className="text-sm text-white/90">整点开抢，超低价限量抢购</p>
        </div>

        {/* Session Tabs */}
        <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto sticky top-[52px] z-10 border-b border-gray-100">
          {FLASH_SALE_SESSIONS.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg transition-all ${
                selectedSession === session.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className="font-semibold text-sm mb-1">{session.time}</div>
              <div className="text-xs">{session.label}</div>
            </button>
          ))}
        </div>

        {/* Countdown */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 flex items-center justify-center">
          <Countdown
            targetHour={
              FLASH_SALE_SESSIONS.find(s => s.id === selectedSession)
                ?.startHour || 10
            }
          />
        </div>

        {/* Products Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {currentProducts.map(product => {
            const stockPercent =
              ((product.stock - product.sold) / product.stock) * 100;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {product.discount}% OFF
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium mb-2 line-clamp-2 h-10">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-bold text-red-600">
                      ₽{product.flashPrice}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      ₽{product.originalPrice}
                    </span>
                  </div>

                  {/* Stock Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>已抢{product.sold}шт</span>
                      <span>剩余{product.stock - product.sold}шт</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-orange-600 transition-all"
                        style={{ width: `${100 - stockPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Buy Button */}
                  <Button
                    onClick={() => handleBuy(product.id)}
                    disabled={product.sold >= product.stock}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-full py-2 text-sm disabled:opacity-50"
                  >
                    {product.sold >= product.stock
                      ? "Распродано"
                      : "Купить сейчас"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rules Section */}
        <div className="p-4">
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold mb-3">秒杀规则</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 每日三场秒杀：10:00、14:00、20:00</p>
              <p>• 每场持续2ч，售完即止</p>
              <p>• 每человек每场限购1шт同款Товары</p>
              <p>• 秒杀Товары不支持退换货</p>
              <p>• Сейчас格仅在活动时间内有效</p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
