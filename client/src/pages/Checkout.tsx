import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  Store,
  Clock,
  Wallet,
  Truck,
  Tag,
} from "lucide-react";
import CouponModal from "@/components/CouponModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const {
    drinkCart,
    drinkCartTotal,
    clearDrinkCart,
    updateDrinkCartQuantity,
    removeFromDrinkCart,
    mallCart,
    mallCartTotal,
    clearMallCart,
    updateMallCartQuantity,
    removeFromMallCart,
    userPoints,
    deductPoints,
    addOrder,
    coupons,
    selectedCouponId,
    selectCoupon,
    giftCards,
    useGiftCard,
  } = useApp();
  const [usePoints, setUsePoints] = useState(false);
  const [useGiftCardPayment, setUseGiftCardPayment] = useState(false);
  const [selectedGiftCardId, setSelectedGiftCardId] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">(
    "pickup"
  );
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const availableGiftCards = giftCards.filter(
    c => c.status === "active" && c.balance > 0
  );

  const searchParams = new URLSearchParams(window.location.search);
  const source = (searchParams.get("source") as "drink" | "mall") || "drink";

  const isDrink = source === "drink";
  const cart = isDrink ? drinkCart : mallCart;

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const pointsValue = userPoints;
  const canCoverTotal = pointsValue >= cartTotal;

  const selectedCoupon = coupons.find(c => c.id === selectedCouponId);
  const couponDiscount =
    selectedCoupon && cartTotal >= selectedCoupon.minAmount
      ? selectedCoupon.discount
      : 0;

  const deliveryFee = deliveryMethod === "delivery" ? 5 : 0;
  const subtotal = cartTotal + deliveryFee - couponDiscount;

  const selectedGiftCard = giftCards.find(c => c.id === selectedGiftCardId);
  const giftCardBalance = selectedGiftCard ? selectedGiftCard.balance : 0;
  const giftCardPayment =
    useGiftCardPayment && selectedGiftCard
      ? Math.min(giftCardBalance, subtotal)
      : 0;

  const afterGiftCard = Math.max(0, subtotal - giftCardPayment);

  const pointsDeduction = usePoints ? Math.min(pointsValue, afterGiftCard) : 0;

  const finalTotal = Math.max(0, afterGiftCard - pointsDeduction);

  useEffect(() => {
    if (cart.length === 0) {
      setLocation(isDrink ? "/order" : "/mall");
    }
  }, [cart, isDrink, setLocation]);

  const handlePayment = () => {
    if (useGiftCardPayment && selectedGiftCard && giftCardPayment > 0) {
      const orderId = `order_${Date.now()}`;
      const success = useGiftCard(selectedGiftCardId, giftCardPayment, orderId);
      if (!success) {
        toast.error(t("pages_checkout_礼品卡支付失败"));
        return;
      }
    }

    if (pointsDeduction > 0) {
      deductPoints(Math.ceil(pointsDeduction));
    }

    const newOrder = addOrder({
      items: [...cart],
      total: finalTotal,
      status: "preparing",
      type: deliveryMethod,
      source: source,
    });

    // 发送 Telegram 通知
    console.log("=== 准备发送 Telegram 通知 ===");
    console.log("订单信息:", {
      orderId: newOrder?.pickupCode,
      storeName: "莫斯科GO店",
      totalAmount: finalTotal,
      items: cart.map(item => ({ name: item.name, quantity: item.quantity })),
      deliveryMethod: deliveryMethod,
    });

    // 开发环境使用生产服务器 API
    const notifyUrl = window.location.hostname.includes("manus.space")
      ? "https://chutea.cc/api/notify-order"
      : "/api/notify-order";

    fetch(notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: newOrder?.pickupCode || `ORD${Date.now()}`,
        storeName: "莫斯科GO店",
        totalAmount: finalTotal,
        items: cart.map(item => ({ name: item.name, quantity: item.quantity })),
        deliveryMethod: deliveryMethod,
      }),
    })
      .then(res => {
        console.log("Telegram 通知响应状态:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("Telegram 通知响应数据:", data);
      })
      .catch(err => {
        console.error("Telegram 通知失败:", err);
      });

    if (isDrink) {
      clearDrinkCart();
    } else {
      clearMallCart();
    }

    toast.success(t("pages_checkout_订单已提交"));
    setLocation("/orders");
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      if (isDrink) {
        removeFromDrinkCart(itemId);
      } else {
        removeFromMallCart(itemId);
      }
    } else {
      if (isDrink) {
        updateDrinkCartQuantity(itemId, newQuantity);
      } else {
        updateMallCartQuantity(itemId, newQuantity);
      }
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href={isDrink ? "/order" : "/mall"}>
          <ArrowLeft size={24} className="text-foreground cursor-pointer" />
        </Link>
        <h1 className="font-bold text-lg">
          {t("pages_checkout_提交订单")} (
          {isDrink ? t("pages_checkout_餐饮") : t("pages_checkout_商城")})
        </h1>
      </div>

      {/* Delivery Method */}
      <div className="bg-white mt-3 px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={() => setDeliveryMethod("pickup")}
            className={`flex-1 py-3 rounded-xl border-2 transition-all ${
              deliveryMethod === "pickup"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-gray-200 text-muted-foreground"
            }`}
          >
            <Store size={20} className="mx-auto mb-1" />
            <div className="text-sm">{t("pages_checkout_门店自取")}</div>
          </button>
          <button
            onClick={() => setDeliveryMethod("delivery")}
            className={`flex-1 py-3 rounded-xl border-2 transition-all ${
              deliveryMethod === "delivery"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-gray-200 text-muted-foreground"
            }`}
          >
            <Truck size={20} className="mx-auto mb-1" />
            <div className="text-sm">{t("pages_checkout_外卖配送")}</div>
          </button>
        </div>
      </div>

      {/* Store Info */}
      <Link href="/stores">
        <div className="bg-white mt-3 px-4 py-4 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              <span className="font-bold">
                {t("pages_checkout_莫斯科go店")}
              </span>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {t("pages_checkout_莫斯科市中心特维尔大街12号")}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} />
            <span>
              {t("pages_checkout_预计")}{" "}
              {deliveryMethod === "pickup" ? "15-20" : "30-40"}{" "}
              {t("pages_checkout_分钟")}
            </span>
          </div>
        </div>
      </Link>

      {/* Order Items */}
      <div className="bg-white mt-3 px-4 py-4">
        <h2 className="font-bold mb-3">{t("pages_checkout_商品清单")}</h2>
        <div className="space-y-3">
          {cart.map(item => (
            <div key={item.id} className="flex gap-3">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs mb-1 truncate">
                    {item.name}
                  </h3>
                  {item.specs && (
                    <p className="text-[11px] text-muted-foreground mb-1">
                      {item.specs}
                    </p>
                  )}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="border-l-2 border-gray-200 pl-2 mt-1 space-y-0.5">
                      {item.toppings.map((topping, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 text-[10px] text-gray-600"
                        >
                          <span>{topping.name}</span>
                          <span className="text-primary font-medium">
                            {formatCurrency(topping.price)}
                          </span>
                          <span className="text-gray-400">
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary font-bold text-base">
                    {formatCurrency(item.price.toFixed(2))}
                  </span>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-full px-1 py-1">
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all shadow-sm font-bold text-base"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold min-w-[24px] text-center px-2">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-full bg-primary border border-primary flex items-center justify-center text-white hover:bg-primary/90 active:scale-95 transition-all shadow-sm font-bold text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupon Selection */}
      <div
        className="bg-white mt-3 px-4 py-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => setIsCouponModalOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Tag size={20} className="text-primary" />
          <div>
            <div className="font-bold">{t("pages_checkout_优惠券")}</div>
            {selectedCoupon ? (
              <div className="text-xs text-primary">
                -{formatCurrency(couponDiscount)}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {
                  coupons.filter(c => c.available && cartTotal >= c.minAmount)
                    .length
                }{" "}
                {t("pages_checkout_张可用")}
              </div>
            )}
          </div>
        </div>
        <ChevronRight size={20} className="text-muted-foreground" />
      </div>

      {/* Gift Card Payment */}
      {availableGiftCards.length > 0 && (
        <div className="bg-white mt-3 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-primary" />
              <div>
                <div className="font-bold">
                  {t("pages_checkout_使用礼品卡")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {availableGiftCards.length} {t("pages_checkout_张可用")}
                </div>
              </div>
            </div>
            <Switch
              checked={useGiftCardPayment}
              onCheckedChange={setUseGiftCardPayment}
            />
          </div>

          {useGiftCardPayment && (
            <div className="space-y-2">
              {availableGiftCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => setSelectedGiftCardId(card.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedGiftCardId === card.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{card.code}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("pages_checkout_余额")}:{" "}
                        {formatCurrency(card.balance.toFixed(2))}
                      </div>
                    </div>
                    {selectedGiftCardId === card.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Points */}
      {afterGiftCard > 0 && pointsValue > 0 && (
        <div className="bg-white mt-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-primary" />
              <div>
                <div className="font-bold">{t("pages_checkout_使用积分")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("pages_checkout_可用")} {userPoints}{" "}
                  {t("pages_checkout_积分")} (≈₽{pointsValue.toFixed(2)})
                </div>
              </div>
            </div>
            <Switch
              checked={usePoints}
              onCheckedChange={checked => {
                setUsePoints(checked);
                if (checked && selectedCouponId) {
                  selectCoupon("");
                }
              }}
            />
          </div>
          {usePoints && (
            <div className="text-xs text-green-600 mt-2">
              {canCoverTotal
                ? `${t("pages_checkout_将抵扣")} ₽${afterGiftCard.toFixed(2)}，${t("pages_checkout_剩余")} ${formatCurrency((pointsValue - afterGiftCard).toFixed(0))} ${t("pages_checkout_积分")}`
                : `${t("pages_checkout_将抵扣")} ₽${formatCurrency(pointsValue.toFixed(2))}，${t("pages_checkout_所有积分将被使用")}`}
            </div>
          )}
        </div>
      )}

      {/* Price Breakdown */}
      <div className="bg-white mt-3 px-4 py-4">
        <h2 className="font-bold mb-3">{t("pages_checkout_结算明细")}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("pages_checkout_商品小计")}
            </span>
            <span>{formatCurrency(cartTotal.toFixed(2))}</span>
          </div>
          {deliveryMethod === "delivery" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("pages_checkout_配送费")}
              </span>
              <span>{formatCurrency(deliveryFee.toFixed(2))}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{t("pages_checkout_优惠券折扣")}</span>
              <span>-{formatCurrency(couponDiscount.toFixed(2))}</span>
            </div>
          )}
          {giftCardPayment > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>{t("pages_checkout_礼品卡支付")}</span>
              <span>-{formatCurrency(giftCardPayment.toFixed(2))}</span>
            </div>
          )}
          {pointsDeduction > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                {t("pages_checkout_积分抵扣")} ({Math.ceil(pointsDeduction)}{" "}
                {t("pages_checkout_积分")})
              </span>
              <span>-{formatCurrency(pointsDeduction.toFixed(2))}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-bold">{t("pages_checkout_合计")}</span>
            <span className="text-primary font-bold text-lg">
              {formatCurrency(finalTotal.toFixed(2))}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex items-center gap-3 shadow-lg">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">
            {t("pages_checkout_合计")}
          </div>
          <div className="text-primary font-bold text-xl">
            {formatCurrency(finalTotal.toFixed(2))}
          </div>
        </div>
        <Button
          onClick={handlePayment}
          className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 rounded-full"
        >
          {t("pages_checkout_提交订单")}
        </Button>
      </div>

      {/* Coupon Modal */}
      <CouponModal
        open={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        coupons={coupons}
        selectedCouponId={selectedCouponId}
        onSelectCoupon={couponId => {
          selectCoupon(couponId);
          if (couponId && usePoints) {
            setUsePoints(false);
          }
        }}
        totalAmount={cartTotal}
      />
    </div>
  );
}
