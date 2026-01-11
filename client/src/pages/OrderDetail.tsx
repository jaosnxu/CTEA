import { useState } from "react";
import { ArrowLeft, MapPin, Phone, MessageCircle, Clock, CheckCircle, Package, Truck, Star, Share2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Link, useLocation, useRoute } from "wouter";
import { useApp, OrderReview } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import ReviewModal from "@/components/ReviewModal";
import ShareModal from "@/components/ShareModal";
import { formatCurrency } from "@/lib/i18n";

export default function OrderDetail() {
  const { t } = useLanguage();
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const { orders, cancelOrder, reviews } = useApp();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const order = orders.find(o => o.id === params?.id);
  const orderReview = reviews.find((r: OrderReview) => r.orderId === params?.id);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">订заказов不存在</p>
          <Link href="/orders">
            <Button>返回Список заказов</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: "pending", label: "Заказ оформлен", icon: CheckCircle },
    { key: "preparing", label: "В процессе", icon: Package },
    { key: "delivering", label: order.type === "pickup" ? "Готов к выдаче" : "Доставляется", icon: Truck },
    { key: "completed", label: "Завершён", icon: CheckCircle }
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  const handleCancelOrder = () => {
    if (confirm("Вы уверены, что хотите отменить этот заказ?")) {
      cancelOrder(order.id);
      toast.success("Заказ отменён");
      setLocation("/orders");
    }
  };

  const canCancel = order.status === "pending" || order.status === "preparing";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/orders">
          <ArrowLeft size={24} className="text-foreground cursor-pointer" />
        </Link>
        <h1 className="font-bold text-lg">Детали заказа</h1>
      </div>

      {/* Status Timeline */}
      <div className="bg-white mt-3 px-4 py-6">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
            />
          </div>

          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-muted-foreground"
                  } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={`text-xs text-center ${
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Код получения */}
      <div className="bg-white mt-3 px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* 二维码 */}
          <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
            <QRCodeSVG 
              value={`CHUTEA-ORDER-${order.id}-${order.pickupCode}`}
              size={160}
              level="H"
              includeMargin={false}
            />
          </div>
          
          {/* 提货码 */}
          <div className="text-center">
            <span className="text-sm text-muted-foreground block mb-1">Код получения</span>
            <span className="text-4xl font-bold text-primary tracking-wider">{order.pickupCode}</span>
            <p className="text-xs text-muted-foreground mt-2">
              请向店员出示此二维码或Код получения
            </p>
          </div>
        </div>
      </div>

      {/* Store/Delivery Info */}
      <div className="bg-white mt-3 px-4 py-4">
        <div className="flex items-start gap-3 mb-3">
          <MapPin size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold mb-1">
              {order.type === "pickup" ? "Самовывоз" : "Доставка"}
            </div>
            <div className="text-sm text-muted-foreground">
              莫斯科市中心特维尔大街 12 号
            </div>
            {order.type === "delivery" && (
              <div className="text-sm text-muted-foreground mt-1">
                预计送达时间：30-40 мин
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1">
            <Phone size={14} className="mr-1" />
            联系商家
          </Button>
          {order.type === "delivery" && (
            <Button variant="outline" size="sm" className="flex-1">
              <MessageCircle size={14} className="mr-1" />
              联系骑手
            </Button>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white mt-3 px-4 py-4">
        <h2 className="font-bold mb-3">Товары</h2>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-3">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1 truncate">{item.name}</h3>
                {item.specs && (
                  <p className="text-xs text-muted-foreground mb-1">{item.specs}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-sm">{formatCurrency(item.price)}</span>
                  <span className="text-sm text-muted-foreground">x {item.quantity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-white mt-3 px-4 py-4">
        <h2 className="font-bold mb-3">订заказов信息</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">订заказов编号</span>
            <span>{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Время заказа</span>
            <span>{new Date(order.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">订заказов类型</span>
            <span>{order.source === "drink" ? "Молочный чай" : "Магазин"}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-bold">К оплате</span>
            <span className="text-primary font-bold text-lg">{formatCurrency(order.total.toFixed(2))}</span>
          </div>
        </div>
      </div>

      {/* 底部Действия按钮 */}
      {canCancel && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/orders")}
            className="flex-1"
          >
            返回订заказов
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelOrder}
            className="flex-1"
          >
            Отмена订заказов
          </Button>
        </div>
      )}

      {/* Готово订заказов的评价和分享按钮 */}
      {order.status === "completed" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowShareModal(true)}
            className="flex-1"
          >
            <Share2 size={18} className="mr-2" />
            分享
          </Button>
          {!orderReview && (
            <Button
              onClick={() => setIsReviewModalOpen(true)}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              评价订заказов
            </Button>
          )}
        </div>
      )}

      {/* 评价弹窗 */}
      <ReviewModal
        open={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        orderId={order.id}
      />
      
      {/* 分享弹窗 */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Мой заказ в CHUTEA`}
        description={`Заказ №${order.id}, ${order.items.length} товаров, итого ${formatCurrency(order.total.toFixed(2))}`}
        imageUrl={order.items[0]?.image}
        shareUrl={`${window.location.origin}/orders/${order.id}?ref=share`}
      />
      {/* Уже有评价显示 */}
      {orderReview && (
        <div className="bg-white mt-3 p-4">
          <h2 className="font-bold mb-3">我的评价</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={20}
                  className={star <= orderReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {orderReview.createdAt}
              </span>
            </div>
            {orderReview.comment && (
              <p className="text-sm">{orderReview.comment}</p>
            )}
            {orderReview.images && orderReview.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {orderReview.images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Фото отзыва"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
