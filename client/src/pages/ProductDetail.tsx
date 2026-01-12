import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Heart, ShoppingCart, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp, PRODUCTS } from "@/contexts/AppContext";
import { toast } from "sonner";
import ProductSpecModal from "@/components/ProductSpecModal";
import ShareModal from "@/components/ShareModal";
import { formatCurrency } from "@/lib/i18n";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const { addToFavorites, removeFromFavorites, isFavorite, reviews } = useApp();

  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"intro" | "nutrition" | "reviews">(
    "intro"
  );

  const product = PRODUCTS.find(p => p.id === params?.id);

  useEffect(() => {
    if (!product) {
      toast.error("Товар не найден");
      setLocation("/order");
    }
  }, [product, setLocation]);

  if (!product) return null;

  const favorite = isFavorite(product.id);
  const productReviews = reviews.filter(r => {
    // 简化：假设评价关联到产品ID（实际应该通过订заказов关联）
    return true; // 显示所有评价作为示例
  });

  // 提取所有Фото
  const allReviewImages = productReviews
    .filter(r => r.images && r.images.length > 0)
    .flatMap(r => r.images);

  const avgRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) /
        productReviews.length
      : 5.0;

  const handleToggleFavorite = () => {
    if (favorite) {
      removeFromFavorites(product.id);
      toast.success("Удалено из избранного");
    } else {
      addToFavorites({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        type: "drink",
        addedAt: Date.now(),
      });
      toast.success("Добавлено в избранное");
    }
  };

  const handleAddToCart = () => {
    setShowSpecModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setLocation("/order")}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Товары详情</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={handleToggleFavorite}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Heart
              size={20}
              className={favorite ? "fill-red-500 text-red-500" : ""}
            />
          </button>
        </div>
      </div>

      {/* Product Image */}
      <div className="bg-white">
        <div className="w-full aspect-square relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white mt-2 px-4 py-4">
        <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            {product.reviews} отзывов
          </span>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            {product.likes} человек喜欢
          </span>
        </div>
        <div className="text-primary font-bold text-3xl">
          {formatCurrency(product.price)}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white mt-2">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("intro")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "intro"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-500"
            }`}
          >
            产品介绍
          </button>
          <button
            onClick={() => setActiveTab("nutrition")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "nutrition"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-500"
            }`}
          >
            营养成分
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "reviews"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-500"
            }`}
          >
            用户评价
          </button>
        </div>

        {/* Tab Content */}
        <div className="px-4 py-6">
          {activeTab === "intro" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">产品描述</h3>
                <p className="text-gray-700 leading-relaxed">{product.desc}</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">推荐理由</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>精选优质原料，每День新鲜制作</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>独家配方，口感层次丰富</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>可根据个человекВкус自由调整Сладость和Холодный度</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "nutrition" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-4">营养信息（每份）</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-700">能量</span>
                    <span className="font-bold">{product.energy} kcal</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-700">糖分</span>
                    <span className="font-bold">{product.sugar} g</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-700">蛋白质</span>
                    <span className="font-bold">3.5 g</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">脂肪</span>
                    <span className="font-bold">8.2 g</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                *
                营养成分数据基于Стандарт配方计算，实际数值可能因个человек定制（如Сладость、小料等）而有所差异。
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-6">
              {productReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  暂Нет评价，快来抢先评价吧~
                </div>
              ) : (
                <>
                  {/* 评分统计 */}
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary mb-1">
                          {avgRating.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 justify-center mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={16}
                              className={
                                star <= Math.round(avgRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">综合评分</div>
                      </div>
                      <div className="h-16 w-px bg-orange-200" />
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-800 mb-1">
                          {productReviews.length}
                        </div>
                        <div className="text-sm text-gray-600">用户评价</div>
                      </div>
                    </div>
                  </div>

                  {/* 用户Фото */}
                  {allReviewImages.length > 0 && (
                    <div>
                      <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                        <span>用户Фото</span>
                        <span className="text-sm text-gray-400 font-normal">
                          ({allReviewImages.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {allReviewImages.slice(0, 8).map((img, idx) => (
                          <div
                            key={idx}
                            className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                          >
                            <img
                              src={img}
                              alt={`Фото ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                      {allReviewImages.length > 8 && (
                        <button className="w-full mt-3 py-2 text-sm text-primary font-medium">
                          查看Все {allReviewImages.length} 张Фото →
                        </button>
                      )}
                    </div>
                  )}

                  {/* 评论列表 */}
                  <div>
                    <h3 className="font-bold text-base mb-3">Все评价</h3>
                    <div className="space-y-4">
                      {productReviews.map((review, index) => (
                        <div
                          key={review.id}
                          className="bg-white rounded-xl p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-bold">
                                {String.fromCharCode(65 + (index % 26))}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-800">
                                  用户{String.fromCharCode(65 + (index % 26))}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      size={14}
                                      className={
                                        star <= review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString(
                                  "zh-CN",
                                  {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            {review.comment}
                          </p>
                          {review.images && review.images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {review.images.map((img, idx) => (
                                <div
                                  key={idx}
                                  className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                                >
                                  <img
                                    src={img}
                                    alt={`Фото отзыва ${idx + 1}`}
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-lg z-20">
        <Button
          onClick={handleAddToCart}
          className="flex-1 h-12 text-base font-bold rounded-full"
        >
          <ShoppingCart size={20} className="mr-2" />В корзину
        </Button>
      </div>

      {/* Spec Modal */}
      <ProductSpecModal
        open={showSpecModal}
        onClose={() => setShowSpecModal(false)}
        product={{
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          sizes: [
            { name: "Стандарт", price: product.price },
            { name: "Большой", price: product.price + 3 },
          ],
          temperatures: ["Холодный", "Мало льда", "Без льда", "Горячий"],
          sweetness: [
            "Стандарт",
            "Меньше",
            "Половина",
            "Немного сахара",
            "Без сахара",
          ],
          toppings: [
            { name: "Тапиока", price: 3 },
            { name: "Кокос", price: 2 },
            { name: "Пудинг", price: 3 },
            { name: "Таро", price: 4 },
          ],
        }}
        type="drink"
      />

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={product.name}
        description={product.desc}
        imageUrl={product.image}
        shareUrl={`${window.location.origin}/product/${product.id}?ref=share`}
      />
    </div>
  );
}
