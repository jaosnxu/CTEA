import React from 'react';
import { ProductFormData, MemberDiscount } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

const MEMBER_LEVELS = [
  { level: 'REGULAR', label: '普通会员', icon: '👤' },
  { level: 'SILVER', label: '银卡会员', icon: '🥈' },
  { level: 'GOLD', label: '金卡会员', icon: '🥇' },
  { level: 'PLATINUM', label: '白金会员', icon: '💎' },
] as const;

// 模拟的优惠券列表
const AVAILABLE_COUPONS = [
  { id: 'coupon_1', name: '新品尝鲜券', discount: '立减 50₽' },
  { id: 'coupon_2', name: '满减优惠券', discount: '满 200 减 30' },
  { id: 'coupon_3', name: '折扣券', discount: '9 折' },
  { id: 'coupon_4', name: '会员专享券', discount: '8.5 折' },
];

export default function MarketingTab({ data, onChange }: Props) {
  const updateMemberDiscount = (
    level: MemberDiscount['level'],
    discountPercent: number
  ) => {
    const newDiscounts = [...(data.memberDiscounts || [])];
    const existingIndex = newDiscounts.findIndex((d) => d.level === level);

    if (existingIndex >= 0) {
      if (discountPercent === 0) {
        // 如果折扣为 0，移除该折扣
        newDiscounts.splice(existingIndex, 1);
      } else {
        newDiscounts[existingIndex].discountPercent = discountPercent;
      }
    } else if (discountPercent > 0) {
      newDiscounts.push({ level, discountPercent });
    }

    onChange({ memberDiscounts: newDiscounts });
  };

  const getMemberDiscount = (level: MemberDiscount['level']): number => {
    const discount = (data.memberDiscounts || []).find((d) => d.level === level);
    return discount?.discountPercent || 0;
  };

  const toggleCoupon = (couponId: string) => {
    const currentCoupons = data.couponIds || [];
    const newCoupons = currentCoupons.includes(couponId)
      ? currentCoupons.filter((id) => id !== couponId)
      : [...currentCoupons, couponId];
    onChange({ couponIds: newCoupons });
  };

  return (
    <div className="space-y-8">
      {/* 会员折扣 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">会员折扣</h3>
        <p className="text-sm text-gray-500 mb-6">
          配置不同会员等级的折扣力度（如输入 5 表示 95 折）
        </p>

        <div className="grid grid-cols-2 gap-4">
          {MEMBER_LEVELS.map(({ level, label, icon }) => {
            const discount = getMemberDiscount(level);
            const finalPrice = data.basePrice * (1 - discount / 100);

            return (
              <div
                key={level}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="font-medium text-gray-900">{label}</span>
                  </div>
                  {discount > 0 && (
                    <span className="text-sm text-green-600 font-medium">
                      {100 - discount} 折
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-700">
                    折扣力度 (%)
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) =>
                      updateMemberDiscount(level, parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="1"
                  />
                  {discount > 0 && (
                    <p className="text-sm text-gray-500">
                      会员价：₽ {finalPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 优惠券 */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">可用优惠券</h3>
        <p className="text-sm text-gray-500 mb-6">
          选择可用于此产品的优惠券
        </p>

        <div className="grid grid-cols-2 gap-4">
          {AVAILABLE_COUPONS.map((coupon) => {
            const isSelected = (data.couponIds || []).includes(coupon.id);

            return (
              <button
                key={coupon.id}
                onClick={() => toggleCoupon(coupon.id)}
                className={`border-2 rounded-lg p-4 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎟️</span>
                      <span className="font-medium text-gray-900">
                        {coupon.name}
                      </span>
                    </div>
                    <p className="text-sm text-orange-600 font-medium">
                      {coupon.discount}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-xl">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {(data.couponIds || []).length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ 已选择 {(data.couponIds || []).length} 张优惠券
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
