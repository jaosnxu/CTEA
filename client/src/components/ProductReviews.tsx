import { Star, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useApp } from "@/contexts/AppContext";

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({
  productId,
  productName,
}: ProductReviewsProps) {
  const { t } = useLanguage();
  const { reviews } = useApp();

  // 筛选当前商品的评价（通过订单关联）
  const { orders } = useApp();
  const productReviews = reviews.filter(review => {
    const order = orders.find(o => o.id === review.orderId);
    if (!order) return false;
    // 检查订单中是否包含该商品
    return order.items.some(item => item.name === productName);
  });

  if (productReviews.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-gray-400">暂无评价</p>
      </div>
    );
  }

  // 计算平均评分
  const averageRating =
    productReviews.reduce((sum, review) => sum + review.rating, 0) /
    productReviews.length;
  const roundedRating = Math.round(averageRating * 10) / 10;

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">用户评价</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={16}
                className={
                  star <= Math.round(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
          <span className="text-sm font-bold">{roundedRating}</span>
          <span className="text-sm text-gray-500">
            ({productReviews.length}条评价)
          </span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {productReviews.map(review => (
          <div key={review.id} className="bg-gray-50 rounded-lg p-3">
            {/* 用户信息和评分 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium">
                  用户{review.id.slice(0, 6)}
                </span>
              </div>
              <div className="flex items-center gap-1">
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

            {/* 评价内容 */}
            {review.comment && (
              <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
            )}

            {/* 评价图片 */}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {review.images.map((image, idx) => (
                  <img
                    key={idx}
                    src={image}
                    alt={`Фото отзыва ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(image, "_blank")}
                  />
                ))}
              </div>
            )}

            {/* 评价时间 */}
            <div className="text-xs text-gray-400 mt-2">
              {new Date(review.createdAt).toLocaleDateString("zh-CN")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
