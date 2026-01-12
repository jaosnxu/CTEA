import { useState } from "react";
import {
  X,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  Flame,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp, Product } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ProductDetailModal({
  product,
  onClose,
}: ProductDetailModalProps) {
  const { addToDrinkCart } = useApp();
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [selectedTemp, setSelectedTemp] = useState(
    t("components_productdetailmodal_冰")
  );
  const [selectedSugar, setSelectedSugar] = useState(
    t("components_productdetailmodal_标准糖")
  );

  if (!product) return null;

  const handleAddToCart = () => {
    addToDrinkCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      specs: `${selectedTemp}/${selectedSugar}`,
      image: product.image,
    });
    if (onClose) onClose();
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col w-full">
      {/* Image Header */}
      <div className="relative h-64 bg-gray-100 shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(product.price)}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          {product.desc}
        </p>

        {/* Nutrition Info */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Flame size={14} />
            <span>{product.energy} 千卡</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Droplets size={14} />
            <span>{product.sugar}g 糖分</span>
          </div>
        </div>

        {/* Specs Selection */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block">
              温度
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                t("components_productdetailmodal_冰"),
                t("components_productdetailmodal_少冰"),
                t("components_productdetailmodal_去冰"),
                t("components_productdetailmodal_温"),
                t("components_productdetailmodal_热"),
              ].map(temp => (
                <button
                  key={temp}
                  onClick={() => setSelectedTemp(temp)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTemp === temp
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {temp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block">
              甜度
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                t("components_productdetailmodal_标准糖"),
                t("components_productdetailmodal_少糖"),
                t("components_productdetailmodal_半糖"),
                t("components_productdetailmodal_微糖"),
                t("components_productdetailmodal_不另加糖"),
              ].map(sugar => (
                <button
                  key={sugar}
                  onClick={() => setSelectedSugar(sugar)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSugar === sugar
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {sugar}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Social Stats */}
        <div className="flex items-center gap-4 py-4 border-t border-gray-100 mb-4">
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <Heart size={16} className="text-red-500 fill-red-500" />
            <span>{product.likes} 人喜欢</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MessageCircle size={16} />
            <span>{product.reviews} 条评价</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm disabled:opacity-50"
            disabled={quantity <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="font-bold w-4 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <Plus size={14} />
          </button>
        </div>
        <Button
          className="flex-1 rounded-full font-bold h-11"
          onClick={handleAddToCart}
        >
          加入购物袋 · {formatCurrency(product.price * quantity)}
        </Button>
      </div>
    </div>
  );
}
