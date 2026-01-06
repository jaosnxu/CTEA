
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// 定义后端数据接口
interface Variant {
  id: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price_adjustment: number;
}

interface Addon {
  id: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price: number;
}

interface Product {
  id: number;
  name_zh: string;
  name_en: string;
  name_ru: string;
  description_zh: string;
  description_en: string;
  description_ru: string;
  price: number;
  image: string;
  category: string;
  tags: string[];
  variants: Variant[];
  addons: Addon[];
}

interface CartItem extends Product {
  cartId: string;
  selectedVariant: Variant;
  selectedAddons: Addon[];
  quantity: number;
  totalPrice: number;
}

const CATEGORIES = [
  { id: "seasonal", icon: "🍓" },
  { id: "milktea", icon: "🧋" },
  { id: "fruit_tea", icon: "🍋" },
  { id: "slush", icon: "🧊" },
];

export default function Order() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("seasonal");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // 选中的规格和加料状态
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [quantity, setQuantity] = useState(1);

  // 获取后端数据
  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          throw new Error("API returned non-JSON response");
        }
      })
      .then((data) => setProducts(data))
      .catch((err) => console.error("Failed to fetch products:", err));
  }, []);

  // 当打开弹窗时，重置选择状态
  useEffect(() => {
    if (selectedProduct) {
      // 默认选中第一个规格
      if (selectedProduct.variants && selectedProduct.variants.length > 0) {
        setSelectedVariant(selectedProduct.variants[0]);
      }
      setSelectedAddons([]);
      setQuantity(1);
    }
  }, [selectedProduct]);

  // 计算当前商品总价
  const calculateCurrentPrice = () => {
    if (!selectedProduct) return 0;
    let price = selectedProduct.price;
    if (selectedVariant) {
      price += selectedVariant.price_adjustment;
    }
    selectedAddons.forEach((addon) => {
      price += addon.price;
    });
    return price * quantity;
  };

  // 获取当前语言对应的文本
  const getLocalizedText = (item: any, field: string) => {
    const lang = i18n.language; // 'en', 'zh', 'ru'
    return item[`${field}_${lang}`] || item[`${field}_en`];
  };

  const addToCart = () => {
    if (!selectedProduct || !selectedVariant) return;
    
    const newItem: CartItem = {
      ...selectedProduct,
      cartId: Math.random().toString(36).substr(2, 9),
      selectedVariant,
      selectedAddons,
      quantity,
      totalPrice: calculateCurrentPrice(),
    };

    setCart([...cart, newItem]);
    setSelectedProduct(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("order.search_placeholder")}
              className="w-full bg-gray-100 rounded-full py-2 pl-9 pr-4 text-sm outline-none"
            />
          </div>
          <div className="flex bg-black text-white rounded-full p-1">
            <button className="px-4 py-1 rounded-full bg-gray-800 text-xs font-medium">
              {t("order.pickup_toggle")}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Categories */}
        <ScrollArea className="w-[85px] bg-gray-50 h-full">
          <div className="flex flex-col pb-24">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-4 px-1 w-full transition-colors relative",
                  selectedCategory === cat.id
                    ? "bg-white text-black font-medium"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {selectedCategory === cat.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-black rounded-r-full" />
                )}
                <span className="text-xl mb-1">{cat.icon}</span>
                <span className="text-[10px] text-center leading-tight">
                  {t(`categories.${cat.id}`)}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Product List */}
        <ScrollArea className="flex-1 bg-white h-full">
          <div className="p-4 pb-32">
            <h2 className="text-sm font-bold mb-4 sticky top-0 bg-white py-2 z-10">
              {t(`categories.${selectedCategory}`)}
            </h2>
            <div className="space-y-6">
              {products
                .filter((p) => {
                  if (selectedCategory === "seasonal") {
                    return p.tags && p.tags.includes("Seasonal");
                  }
                  return p.category === selectedCategory;
                })
                .map((product) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={product.image}
                        alt={getLocalizedText(product, "name")}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-base leading-tight mb-1">
                          {getLocalizedText(product, "name")}
                        </h3>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                          {getLocalizedText(product, "description")}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-medium">₽</span>
                          <span className="text-lg font-bold">{product.price}</span>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 px-3 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium text-xs shadow-none"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {t("order.select")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="w-[92%] max-w-[400px] rounded-[20px] p-0 overflow-hidden border-none bg-white/90 backdrop-blur-[10px] shadow-2xl gap-0">
          <DialogTitle className="sr-only">Product Details</DialogTitle>
          {selectedProduct && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Image Header */}
              <div className="relative h-48 shrink-0">
                <img
                  src={selectedProduct.image}
                  alt={getLocalizedText(selectedProduct, "name")}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <h2 className="text-xl font-bold mb-2">
                  {getLocalizedText(selectedProduct, "name")}
                </h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {getLocalizedText(selectedProduct, "description")}
                </p>

                {/* Variants */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-wider">
                      {t("order.size")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-medium transition-all border",
                            selectedVariant?.id === variant.id
                              ? "bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {getLocalizedText(variant, "name")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-wider">
                      {t("order.toppings")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.addons.map((addon) => {
                        const isSelected = selectedAddons.some((a) => a.id === addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
                              } else {
                                setSelectedAddons([...selectedAddons, addon]);
                              }
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-medium transition-all border",
                              isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {getLocalizedText(addon, "name")} (+₽{addon.price})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg font-medium"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-xl font-bold">
                    ₽{calculateCurrentPrice()}
                  </div>
                </div>
                <Button 
                  className="w-full h-12 rounded-full bg-black text-white font-bold text-base shadow-lg hover:bg-gray-800"
                  onClick={addToCart}
                >
                  {t("order.add_to_cart")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-20">
          <div className="bg-black text-white rounded-full p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold">
                {cartCount}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-300">{t("order.total")}</span>
                <span className="text-xl font-bold">₽{cartTotal}</span>
              </div>
            </div>
            <button className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-100 transition-colors">
              {t("order.checkout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
