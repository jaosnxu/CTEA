import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ChevronLeft,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

// Магазин产品数据（与 Mall.tsx 保持一致）
const MALL_PRODUCTS = [
  {
    id: "m1",
    brand: "CHUTEA x NIKE",
    name: "Air Force 1 'Tea Leaf' Коллаб",
    price: 12999,
    sold: "1.2k",
    image: "/images/products/mall_sneaker.jpg",
    tag: "Коллаб",
    desc: "Лимитированные кроссовки CHUTEA x NIKE",
  },
  {
    id: "m2",
    brand: "CHUTEA",
    name: "Классический худи с логотипом",
    price: 4500,
    sold: "856",
    image: "/images/products/mall_hoodie.jpg",
    tag: "Новинки",
    desc: "100% хлопок, комфортный и дышащий",
  },
  {
    id: "m3",
    brand: "CHUTEA",
    name: "Керамический чайный набор премиум",
    price: 8900,
    sold: "342",
    image: "/images/products/mall_teaset.jpg",
    tag: "",
    desc: "Изысканный керамический чайный набор",
  },
  {
    id: "m4",
    brand: "CHUTEA",
    name: "Эко-сумка тоут",
    price: 1200,
    sold: "2.1k",
    image: "/images/products/mall_tote.jpg",
    tag: "Популярное",
    desc: "Экологичный материал, вместительный дизайн",
  },
  {
    id: "m5",
    brand: "CHUTEA",
    name: "Стакан с двойными стенками 500мл",
    price: 1800,
    sold: "900",
    image: "/images/products/mall_tumbler.jpg",
    tag: "",
    desc: "Двойные стенки, сохраняет температуру",
  },
  {
    id: "m6",
    brand: "CHUTEA",
    name: "Подарочная карта {formatCurrency(5000)}",
    price: 5000,
    sold: "156",
    image: "/images/products/mall_giftcard.jpg",
    tag: "",
    desc: "Отличный подарок, универсальный",
  },
];

// 模拟评论数据
const MOCK_REVIEWS = [
  {
    id: 1,
    user: "А***",
    avatar: "👤",
    rating: 5,
    date: "2025-01-05",
    content: "Отличное качество, цвет соответствует, быстрая доставка!",
    images: ["/images/products/mall_sneaker.jpg"],
    specs: "Чёрный / L",
  },
  {
    id: 2,
    user: "И***",
    avatar: "👤",
    rating: 5,
    date: "2025-01-03",
    content: "Очень нравится, уже второй раз покупаю, рекомендую!",
    images: [],
    specs: "Белый / M",
  },
  {
    id: 3,
    user: "М***",
    avatar: "👤",
    rating: 4,
    date: "2025-01-01",
    content:
      "В целом хорошо, но размер немного большой, берите на размер меньше",
    images: [
      "/images/products/mall_sneaker.jpg",
      "/images/products/mall_hoodie.jpg",
    ],
    specs: "Серый / XL",
  },
];

// 模拟购买记录
const MOCK_PURCHASES = [
  { user: "С***", specs: "Чёрный / M", time: "2 мин назад" },
  { user: "Е***", specs: "Белый / L", time: "5 мин назад" },
  { user: "Д***", specs: "Серый / S", time: "10 мин назад" },
];

export default function MallProductDetail() {
  const [, params] = useRoute("/mall/:id");
  const [, setLocation] = useLocation();
  const {
    addToMallCart,
    addToFavorites,
    removeFromFavorites,
    isFavorite: checkIsFavorite,
  } = useApp();
  const { t } = useLanguage();

  const product = MALL_PRODUCTS.find(p => p.id === params?.id);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [activeTab, setActiveTab] = useState<"details" | "reviews" | "params">(
    "details"
  );

  // 滑动手势相关
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 如果产品不存在，返回Магазин页
  useEffect(() => {
    if (!product) {
      setLocation("/mall");
    }
  }, [product, setLocation]);

  if (!product) return null;

  // 模拟多图数据（实际应从产品数据中获取）
  const images = [product.image, product.image, product.image];

  // 模拟Параметры数据
  const colors = ["Чёрный", "Белый", "Серый"];
  const sizes = ["S", "M", "L", "XL"];

  // 计算平均评分
  const averageRating = (
    MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / MOCK_REVIEWS.length
  ).toFixed(1);

  // 处理滑动手势
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        setSelectedImage(prev => (prev + 1) % images.length);
      } else {
        setSelectedImage(prev => (prev - 1 + images.length) % images.length);
      }
    }
  };

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      toast.error("Выберите цвет и размер");
      return;
    }

    addToMallCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      specs: `${selectedColor} / ${selectedSize}`,
    });

    // toast.success("УжеВ корзину");
  };

  const handleBuyNow = () => {
    if (!selectedColor || !selectedSize) {
      toast.error("Выберите цвет и размер");
      return;
    }

    addToMallCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      specs: `${selectedColor} / ${selectedSize}`,
    });

    setLocation("/checkout?source=mall");
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-white">
        {/* 顶部导航栏 */}
        <div className="flex-none bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 z-10">
          <button
            onClick={() => setLocation("/mall")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all">
              <Share2 size={20} />
            </button>
            <button
              onClick={() => {
                if (!product) return;
                if (checkIsFavorite(product.id)) {
                  removeFromFavorites(product.id);
                  toast.success("Удалено из избранного");
                } else {
                  addToFavorites({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    type: "mall",
                    addedAt: Date.now(),
                  });
                  toast.success("Добавлено в избранное");
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            >
              <Heart
                size={20}
                className={
                  product && checkIsFavorite(product.id)
                    ? "fill-red-500 text-red-500"
                    : ""
                }
              />
            </button>
            <button
              onClick={() => setLocation("/mall-checkout")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            >
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 图片轮播区域 */}
          <div
            ref={carouselRef}
            className="relative bg-gray-50 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="aspect-square relative overflow-hidden">
              {!imageLoaded[selectedImage] && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-400 rounded-full animate-spin" />
                </div>
              )}

              <img
                src={images[selectedImage]}
                alt={product.name}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded[selectedImage] ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() =>
                  setImageLoaded(prev => ({ ...prev, [selectedImage]: true }))
                }
                loading="lazy"
              />
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    selectedImage === index
                      ? "w-6 bg-black"
                      : "w-1.5 bg-black/30"
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {selectedImage + 1} / {images.length}
            </div>
          </div>

          {/* 产品信息 */}
          <div className="px-4 py-5 space-y-4">
            {/* 价格和标题 */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-black">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-sm text-gray-400">
                  Продано {product.sold}
                </span>
              </div>
              <h1 className="text-xl font-bold text-black mb-1">
                {product.name}
              </h1>
              <p className="text-sm text-gray-500">
                {product.desc || "Официальный товар CHUTEA"}
              </p>
            </div>

            {/* 评分和购买记录 */}
            <div className="flex items-center gap-4 py-3 border-y border-gray-100">
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">{averageRating}</span>
                <span className="text-sm text-gray-400">
                  ({MOCK_REVIEWS.length} отзывов)
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {MOCK_PURCHASES[0].user} 等 {MOCK_PURCHASES.length} человек
                только что купили
              </div>
            </div>

            {/* Цвет选择 */}
            <div>
              <div className="text-sm font-medium text-black mb-3">Цвет</div>
              <div className="flex gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedColor === color
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-black hover:border-gray-300"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Размер选择 */}
            <div>
              <div className="text-sm font-medium text-black mb-3">Размер</div>
              <div className="flex gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-14 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-black hover:border-gray-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Количество选择 */}
            <div>
              <div className="text-sm font-medium text-black mb-3">
                Количество
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-medium hover:bg-gray-50 active:scale-95 transition-all"
                >
                  -
                </button>
                <span className="text-lg font-medium w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-medium hover:bg-gray-50 active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Tab 切换 */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex gap-6 border-b border-gray-100">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === "details" ? "text-black" : "text-gray-400"
                  }`}
                >
                  {t("pages_mallproductdetail_товары详情")}
                  {activeTab === "details" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("params")}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === "params" ? "text-black" : "text-gray-400"
                  }`}
                >
                  {t("pages_mallproductdetail_параметры参数")}
                  {activeTab === "params" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === "reviews" ? "text-black" : "text-gray-400"
                  }`}
                >
                  {t("pages_mallproductdetail_用户评价")} ({MOCK_REVIEWS.length}
                  )
                  {activeTab === "reviews" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                  )}
                </button>
              </div>

              {/* Tab 内容 */}
              <div className="py-4">
                {activeTab === "details" && (
                  <div className="space-y-6">
                    {/* 产品介绍 */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">
                        {t("pages_mallproductdetail_产品介绍")}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>
                          {product.desc ||
                            "Официальный товар CHUTEA, гарантия качества."}
                        </p>
                        <p>
                          这款产品采用优质材料精心制作，经过严格的质量检验，确保每一шт产品都符合高标准。Нет论是День常Использовать还是送礼，都是您的理想选择。
                        </p>
                      </div>
                    </div>

                    {/* 产品特点 */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">
                        {t("pages_mallproductdetail_产品特点")}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>• 优质材料：精选上乘材料，舒适耐用</p>
                        <p>• Классический设计：CHUTEA 品牌 Logo，时尚百搭</p>
                        <p>• 精湛工艺：细节处理完美，гарантия качества</p>
                        <p>• 易于打理：День常清洁方便，保养简заказов</p>
                        <p>• 多种选择：多种Цвет和Размер可选，满足不同需求</p>
                      </div>
                    </div>

                    {/* 品牌故事 */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">
                        {t("pages_mallproductdetail_品牌故事")}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>
                          CHUTEA
                          是一个源自中国的现代чай饮品牌，致力于将传统чай文化与现代生活方式完美融合。我们不仅提供优质的чай饮产品，还通过Неделя边产品将品牌理念融入您的День常生活。
                        </p>
                        <p>
                          每一款 CHUTEA
                          产品都经过精心设计，融入了我们对品质生活的理解和追求。选择
                          CHUTEA，就是选择一种态度，一种生活方式。
                        </p>
                      </div>
                    </div>

                    {/* Использовать说明 */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">
                        {t("pages_mallproductdetail_использовать说明")}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>1. 首次Использовать前请清洗干净</p>
                        <p>2. 避免长时间暴露在阳光下</p>
                        <p>3. 定期清洁保养，延长Использовать寿命</p>
                        <p>4. 如有问题请联系客服，我们将竞诚为您服务</p>
                      </div>
                    </div>

                    {/* 售后服务 */}
                    <div className="bg-teal-50 rounded-lg p-4">
                      <h3 className="text-base font-semibold mb-2 text-teal-900">
                        售后服务
                      </h3>
                      <div className="space-y-1 text-sm text-teal-700">
                        <p>• 7天Нет理由退换货</p>
                        <p>• 正品保证，假一赔十</p>
                        <p>• 全国联保，售后Нет忧</p>
                        <p>• 24ч在线客服</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "params" && (
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">品牌</span>
                      <span className="text-sm font-medium">
                        {product.brand}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">材质</span>
                      <span className="text-sm font-medium">100% 纯棉</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">产地</span>
                      <span className="text-sm font-medium">中国</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">洗涤方式</span>
                      <span className="text-sm font-medium">机洗</span>
                    </div>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="space-y-4">
                    {/* 评分概览 */}
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">
                          {averageRating}
                        </div>
                        <div className="flex items-center gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={14}
                              className={`${
                                star <= Math.round(parseFloat(averageRating))
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {MOCK_REVIEWS.length} отзывов
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map(rating => {
                          const count = MOCK_REVIEWS.filter(
                            r => r.rating === rating
                          ).length;
                          const percentage =
                            (count / MOCK_REVIEWS.length) * 100;
                          return (
                            <div
                              key={rating}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-gray-500 w-8">
                                {rating}星
                              </span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-gray-500 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 评论列表 */}
                    {MOCK_REVIEWS.map(review => (
                      <div
                        key={review.id}
                        className="border-b border-gray-100 pb-4"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                            {review.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {review.user}
                              </span>
                              <span className="text-xs text-gray-400">
                                {review.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 mb-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={`${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {review.content}
                            </p>
                            {review.images.length > 0 && (
                              <div className="flex gap-2 mb-2">
                                {review.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt="Фото отзыва"
                                    className="w-20 h-20 rounded-lg object-cover"
                                  />
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              Параметры：{review.specs}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Подробнее */}
                    <button className="w-full py-3 text-sm text-gray-500 hover:text-black transition-colors flex items-center justify-center gap-1">
                      查看Все评价
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 底部占 человек */}
            <div className="h-20" />
          </div>
        </div>

        {/* 底部悬浮Действия栏 */}
        <div className="flex-none bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
          <Button
            onClick={handleAddToCart}
            variant="outline"
            className="flex-1 h-12 rounded-full border-2 border-black text-black font-bold hover:bg-gray-50"
          >
            В корзину
          </Button>
          <Button
            onClick={handleBuyNow}
            className="flex-1 h-12 rounded-full bg-black text-white font-bold hover:bg-black/90"
          >
            Купить сейчас
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
