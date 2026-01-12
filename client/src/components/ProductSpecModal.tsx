import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";

interface ProductSpecModalProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
    description?: string;
    calories?: number;
    sugar?: number;
    // Drink-specific options
    sizes?: { name: string; price: number }[];
    temperatures?: string[];
    sweetness?: string[];
    toppings?: { name: string; price: number }[];
    // Mall product-specific options
    colors?: string[];
    productSizes?: string[];
  };
  type: "drink" | "mall";
}

export default function ProductSpecModal({
  open,
  onClose,
  product,
  type,
}: ProductSpecModalProps) {
  const { t } = useLanguage();
  const { addToDrinkCart, addToMallCart } = useApp();

  // Drink options
  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.[0]?.name || "Стандарт"
  );
  const [selectedTemp, setSelectedTemp] = useState(
    product.temperatures?.[0] || "Холодный"
  );
  const [selectedSweetness, setSelectedSweetness] = useState("Стандарт");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  // Mall options
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [selectedProductSize, setSelectedProductSize] = useState(
    product.productSizes?.[0] || ""
  );

  const [quantity, setQuantity] = useState(0);

  // Reset state when product changes
  useEffect(() => {
    if (open) {
      setSelectedSize(product.sizes?.[0]?.name || "Стандарт");
      setSelectedTemp(product.temperatures?.[0] || "Холодный");
      setSelectedSweetness("Стандарт");
      setSelectedToppings([]);
      setSelectedColor(product.colors?.[0] || "");
      setSelectedProductSize(product.productSizes?.[0] || "");
      setQuantity(0);
    }
  }, [open, product]);

  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping)
        ? prev.filter(t => t !== topping)
        : [...prev, topping]
    );
  };

  const calculateTotalPrice = () => {
    let total = product.price;

    if (type === "drink") {
      // Add size price
      const sizeOption = product.sizes?.find(s => s.name === selectedSize);
      if (sizeOption) {
        total = sizeOption.price;
      }

      // Add toppings price
      selectedToppings.forEach(toppingName => {
        const topping = product.toppings?.find(t => t.name === toppingName);
        if (topping) {
          total += topping.price;
        }
      });
    }

    return total * (quantity || 1);
  };

  const handleAddToCart = () => {
    const finalQuantity = quantity || 1;

    if (type === "drink") {
      // 基础规格（不包含小料）
      const specs = [selectedSize, selectedTemp, selectedSweetness].join("、");

      // 小料信息单独传递
      const toppings = selectedToppings.map(toppingName => {
        const topping = product.toppings?.find(t => t.name === toppingName);
        return {
          name: toppingName,
          price: topping?.price || 0,
        };
      });

      // 计算单价（基础价格 + 小料价格）
      let unitPrice = product.price;
      const sizeOption = product.sizes?.find(s => s.name === selectedSize);
      if (sizeOption) {
        unitPrice = sizeOption.price;
      }
      const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
      const finalPrice = unitPrice + toppingsPrice;

      addToDrinkCart({
        productId: product.id,
        specs,
        toppings: toppings.length > 0 ? toppings : undefined,
        price: finalPrice,
        quantity: finalQuantity,
      });
    } else {
      const specs = [selectedColor, selectedProductSize]
        .filter(Boolean)
        .join("、");

      addToMallCart({
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        desc: product.description || "",
        specs,
        quantity: finalQuantity,
      });
    }

    // toast.success("已加入购物车");
    onClose();
  };

  const getSelectedSpecs = () => {
    if (type === "drink") {
      const specs = [selectedSize, selectedTemp, selectedSweetness];
      if (selectedToppings.length > 0) {
        specs.push(...selectedToppings);
      }
      return specs.join("、");
    } else {
      return [selectedColor, selectedProductSize].filter(Boolean).join("、");
    }
  };

  // 分离冷热温度选项
  const coldTemps =
    product.temperatures?.filter(
      t => t.includes("Холодный") || t === "Комнатная"
    ) || [];
  const hotTemps =
    product.temperatures?.filter(t => t === "Горячий" || t === "Тёплый") || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[85vw] sm:w-full p-0 gap-0 h-auto max-h-[80vh] overflow-hidden flex flex-col rounded-2xl">
        <VisuallyHidden>
          <DialogTitle>{product.name}</DialogTitle>
        </VisuallyHidden>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Title */}
          <div className="p-4 pb-2">
            <h2 className="font-bold text-xl">{product.name}</h2>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {/* Drink Options */}
            {type === "drink" && (
              <>
                {/* Size */}
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <h3 className="font-medium text-xs mb-2">
                      {t("components_productspecmodal_份量")}
                    </h3>
                    <div className="flex gap-2">
                      {product.sizes.map(size => (
                        <button
                          key={size.name}
                          onClick={() => setSelectedSize(size.name)}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] transition-all hover:scale-105 active:scale-95 ${
                            selectedSize === size.name
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="text-xs">{size.name}</div>
                          <div
                            className={`text-xs font-medium ${selectedSize === size.name ? "text-[#FF6B00]" : "text-gray-900"}`}
                          >
                            {formatCurrency(size.price)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toppings */}
                {product.toppings && product.toppings.length > 0 && (
                  <div>
                    <h3 className="font-medium text-xs mb-2">
                      {t("components_productspecmodal_小料")}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {product.toppings.map(topping => (
                        <button
                          key={topping.name}
                          onClick={() => toggleTopping(topping.name)}
                          className={`px-2 py-1.5 rounded-lg border transition-all text-center hover:scale-105 active:scale-95 ${
                            selectedToppings.includes(topping.name)
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="text-xs">{topping.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Temperature - 分离冷热 */}
                {product.temperatures && product.temperatures.length > 0 && (
                  <div>
                    <h3 className="font-medium text-xs mb-2">
                      {t("components_productspecmodal_温度")}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {product.temperatures.map(temp => (
                        <button
                          key={temp}
                          onClick={() => setSelectedTemp(temp)}
                          className={`px-2 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                            selectedTemp === temp
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="text-xs">{temp}</div>
                        </button>
                      ))}
                    </div>
                    <div className="hidden">
                      {/* 保留原来的冷热分离逻辑，但隐藏 */}
                      {hotTemps.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {hotTemps.map(temp => (
                            <button
                              key={temp}
                              onClick={() => setSelectedTemp(temp)}
                              className={`px-3 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                                selectedTemp === temp
                                  ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                                  : "border-gray-200 bg-gray-50 text-gray-700"
                              }`}
                            >
                              <div className="text-sm">{temp}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sweetness */}
                {product.sweetness && product.sweetness.length > 0 && (
                  <div>
                    <h3 className="font-medium text-xs mb-2">
                      {t("components_productspecmodal_甜度")}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {product.sweetness.map(sweet => (
                        <button
                          key={sweet}
                          onClick={() => setSelectedSweetness(sweet)}
                          className={`px-2 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                            selectedSweetness === sweet
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="text-xs">{sweet}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mall Product Options */}
            {type === "mall" && (
              <>
                {/* Colors */}
                {product.colors && product.colors.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-3">
                      {t("components_productspecmodal_颜色")}
                    </h3>
                    <div className="flex gap-3">
                      {product.colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                            selectedColor === color
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {product.productSizes && product.productSizes.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-3">
                      {t("components_productspecmodal_尺码")}
                    </h3>
                    <div className="flex gap-3">
                      {product.productSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedProductSize(size)}
                          className={`px-4 py-2.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                            selectedProductSize === size
                              ? "border-[#FF6B00] bg-[#FFF7F0] text-[#FF6B00] font-medium scale-105"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Selected Specs Summary */}
            <div className="text-xs text-gray-600 pt-2">
              {t("components_productspecmodal_已选规格")}：{getSelectedSpecs()}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-[#FF6B00] text-2xl font-bold">
                {formatCurrency(calculateTotalPrice())}
              </span>
            </div>

            {/* Add to Cart or Quantity Control */}
            {quantity === 0 ? (
              <button
                onClick={() => setQuantity(1)}
                className="bg-[#FFD100] text-gray-900 font-medium py-2.5 px-5 rounded-full hover:bg-[#FFD100]/90 transition-colors text-sm"
              >
                {t("components_productspecmodal_加入购物车")}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="text-base font-medium w-6 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full bg-[#FFD100] flex items-center justify-center hover:bg-[#FFD100]/90 transition-colors"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={handleAddToCart}
                  className="bg-[#FFD100] text-gray-900 font-medium py-2 px-4 rounded-full hover:bg-[#FFD100]/90 transition-colors ml-1 text-sm"
                >
                  确定
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Close Button - Fixed position at bottom center of screen */}
      {open && (
        <button
          onClick={onClose}
          className="fixed bottom-[10%] left-1/2 -translate-x-1/2 z-[60] w-10 h-10 bg-transparent rounded-full flex items-center justify-center text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all border-[1.5px] border-white/70"
          aria-label="Закрыть"
        >
          <X size={18} strokeWidth={2} />
        </button>
      )}
    </Dialog>
  );
}
