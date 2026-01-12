import { X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

interface Coupon {
  id: string;
  name: string;
  discount: number;
  minAmount: number;
  validUntil: string;
  available: boolean;
  description?: string;
}

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
  coupons: Coupon[];
  selectedCouponId: string | null;
  onSelectCoupon: (couponId: string | null) => void;
  totalAmount: number;
}

export default function CouponModal({
  open,
  onClose,
  coupons,
  selectedCouponId,
  onSelectCoupon,
  totalAmount,
}: CouponModalProps) {
  const { t } = useLanguage();

  if (!open) return null;

  const availableCoupons = coupons.filter(
    c => c.available && totalAmount >= c.minAmount
  );
  const unavailableCoupons = coupons.filter(
    c => !c.available || totalAmount < c.minAmount
  );

  const handleSelectCoupon = (couponId: string) => {
    if (selectedCouponId === couponId) {
      onSelectCoupon(null); // Deselect
    } else {
      onSelectCoupon(couponId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="text-lg font-bold">
            {t("components_couponmodal_选择优惠券")}
          </h2>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Available Coupons */}
          {availableCoupons.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-600">
                {t("components_couponmodal_可用优惠券")}
              </h3>
              {availableCoupons.map(coupon => (
                <div
                  key={coupon.id}
                  onClick={() => handleSelectCoupon(coupon.id)}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCouponId === coupon.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  {/* Selected Check */}
                  {selectedCouponId === coupon.id && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                      <Check size={16} />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Discount Amount */}
                    <div className="flex-shrink-0 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(coupon.discount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        满{coupon.minAmount}可用
                      </div>
                    </div>

                    {/* Coupon Info */}
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{coupon.name}</h4>
                      {coupon.description && (
                        <p className="text-xs text-gray-500 mb-1">
                          {coupon.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        有效期至 {coupon.validUntil}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unavailable Coupons */}
          {unavailableCoupons.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-600">
                {t("components_couponmodal_不可用优惠券")}
              </h3>
              {unavailableCoupons.map(coupon => (
                <div
                  key={coupon.id}
                  className="relative border-2 border-gray-200 rounded-lg p-4 opacity-50"
                >
                  <div className="flex items-center gap-4">
                    {/* Discount Amount */}
                    <div className="flex-shrink-0 text-center">
                      <div className="text-2xl font-bold text-gray-400">
                        {formatCurrency(coupon.discount)}
                      </div>
                      <div className="text-xs text-gray-400">
                        满{coupon.minAmount}可用
                      </div>
                    </div>

                    {/* Coupon Info */}
                    <div className="flex-1">
                      <h4 className="font-bold mb-1 text-gray-600">
                        {coupon.name}
                      </h4>
                      {coupon.description && (
                        <p className="text-xs text-gray-400 mb-1">
                          {coupon.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {totalAmount < coupon.minAmount
                          ? `Добавьте ещё ${formatCurrency(coupon.minAmount - totalAmount)} для использования`
                          : `Действителен до ${coupon.validUntil}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Coupons */}
          {coupons.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>{t("components_couponmodal_暂无可用优惠券")}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full bg-primary text-white font-bold py-3 rounded-full hover:bg-primary/90 transition-colors"
          >
            {t("components_couponmodal_确定")}
          </button>
        </div>
      </div>
    </div>
  );
}
