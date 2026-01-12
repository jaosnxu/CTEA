import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Tag, Truck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import RussianPaymentModal from "@/components/RussianPaymentModal";
import { formatCurrency } from "@/lib/i18n";

export default function MallCheckout() {
  const [, setLocation] = useLocation();
  const { mallCart, clearMallCart, coupons } = useApp();

  // 模拟数据（实际应从 context 或 API 获取）
  const addresses = [
    {
      id: "1",
      name: "Иван Петров",
      phone: "+7 (999) 123-45-67",
      address: "ул. Красная площадь, д. 123, Москва",
      isDefault: true,
    },
    {
      id: "2",
      name: "Мария Сидорова",
      phone: "+7 (999) 765-43-21",
      address: "пр. Ленина, д. 45, Москва",
      isDefault: false,
    },
  ];

  const paymentMethods = [
    { id: "1", name: "Visa", icon: "💳", cardNumber: "**** **** **** 1234" },
    {
      id: "2",
      name: "Mastercard",
      icon: "💳",
      cardNumber: "**** **** **** 5678",
    },
    { id: "3", name: "WeChat Pay", icon: "💲" },
    { id: "4", name: "Alipay", icon: "💵" },
  ];

  const [selectedAddress, setSelectedAddress] = useState(
    addresses[0]?.id || ""
  );
  const [selectedPayment, setSelectedPayment] = useState(
    paymentMethods[0]?.id || ""
  );
  const [selectedCoupon, setSelectedCoupon] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">(
    "standard"
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (mallCart.length === 0) {
      // toast.error("购物车为空"); // 用户要求Отмена通知
      setLocation("/mall");
    }
  }, [mallCart, setLocation]);

  if (mallCart.length === 0) return null;

  // 计算ТоварыВсего价
  const subtotal = mallCart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // 配送费
  const deliveryFee = deliveryMethod === "express" ? 20 : 10;

  // Скидка券抵扣
  const couponDiscount = selectedCoupon
    ? coupons.find(c => c.id === selectedCoupon)?.discount || 0
    : 0;

  // 最终Всего价
  const total = Math.max(0, subtotal + deliveryFee - couponDiscount);

  const handleSubmitOrder = async () => {
    if (!selectedAddress) {
      toast.error("Выберите адрес");
      return;
    }

    // 打开Способ оплаты选择弹窗
    setShowPaymentModal(true);
  };

  const handlePaymentSelect = (method: string) => {
    toast.loading("Переход на страницу оплаты...", { duration: 2000 });
    setTimeout(() => {
      toast.success(`Оплата через ${method} успешна!`);
      clearMallCart();
      setLocation("/orders");
    }, 2000);
  };

  const availableCoupons = coupons.filter(
    c => c.available && c.minAmount <= subtotal
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button
          onClick={() => setLocation("/mall")}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors mr-3"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Подтвердить заказ</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Адрес доставки */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Адрес доставки</h2>
            <button
              onClick={() => setLocation("/addresses")}
              className="text-sm text-teal-600"
            >
              管理地址
            </button>
          </div>

          {addresses.length === 0 ? (
            <button
              onClick={() => setLocation("/addresses")}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              + 添加Адрес доставки
            </button>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr: any) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAddress === addr.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{addr.name}</span>
                        <span className="text-gray-600">{addr.phone}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded">
                            默认
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{addr.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Способ доставки */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Truck size={18} />
            Способ доставки
          </h2>
          <div className="space-y-2">
            <div
              onClick={() => setDeliveryMethod("standard")}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                deliveryMethod === "standard"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">标准配送</div>
                  <div className="text-sm text-gray-600">预计3-5天送达</div>
                </div>
                <div className="text-teal-600 font-medium">
                  {formatCurrency(10)}
                </div>
              </div>
            </div>
            <div
              onClick={() => setDeliveryMethod("express")}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                deliveryMethod === "express"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">极速配送</div>
                  <div className="text-sm text-gray-600">预计1-2天送达</div>
                </div>
                <div className="text-teal-600 font-medium">
                  {formatCurrency(20)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Товары */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold mb-3">Товары</h2>
          <div className="space-y-3">
            {mallCart.map(item => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 mb-1">{item.specs}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-600 font-medium">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-gray-600 text-sm">
                      x{item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Скидка券 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Tag size={18} />
              Скидка券
            </h2>
            <span className="text-sm text-gray-500">
              {availableCoupons.length}张可用
            </span>
          </div>

          {availableCoupons.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              暂Нет可用Скидка券
            </div>
          ) : (
            <div className="space-y-2">
              {availableCoupons.map(coupon => (
                <div
                  key={coupon.id}
                  onClick={() =>
                    setSelectedCoupon(
                      selectedCoupon === coupon.id ? "" : coupon.id
                    )
                  }
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCoupon === coupon.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-teal-600 mb-1">
                        {formatCurrency(coupon.discount)}
                      </div>
                      <div className="text-sm text-gray-600">{coupon.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        满{formatCurrency(coupon.minAmount)}可用 · 有效期至
                        {coupon.validUntil}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Способ оплаты */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard size={18} />
            Способ оплаты
          </h2>
          <div className="space-y-2">
            {paymentMethods.map((method: any) => (
              <div
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === method.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{method.icon}</div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      {method.cardNumber && (
                        <div className="text-sm text-gray-600">
                          **** {method.cardNumber.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 价格明细 */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold mb-3">价格明细</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ТоварыВсего价</span>
              <span>{formatCurrency(subtotal.toFixed(2))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">配送费</span>
              <span>{formatCurrency(deliveryFee.toFixed(2))}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between text-teal-600">
                <span>Скидка券</span>
                <span>-{formatCurrency(couponDiscount.toFixed(2))}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="font-semibold">实付款</span>
              <span className="text-xl font-bold text-teal-600">
                {formatCurrency(total.toFixed(2))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-600">实付款</div>
            <div className="text-2xl font-bold text-teal-600">
              {formatCurrency(total.toFixed(2))}
            </div>
          </div>
          <Button
            onClick={handleSubmitOrder}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-full text-lg"
          >
            Оформить заказ
          </Button>
        </div>
      </div>

      {/* 俄罗斯Оплата弹窗 */}
      <RussianPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={total}
        onPaymentSelect={handlePaymentSelect}
      />
    </div>
  );
}
