import { useState } from "react";
import { Search, ShoppingCart, ArrowLeft, Heart } from "lucide-react";
import { Link } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import ProductSpecModal from "@/components/ProductSpecModal";
import CartDrawer from "@/components/CartDrawer";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Mall() {
  const {
    mallCart,
    mallCartCount,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  } = useApp();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const categories = [
    t("pages_mall_全部"),
    t("pages_mall_服饰"),
    t("pages_mall_配饰"),
    t("pages_mall_茶具"),
    t("pages_mall_礼品卡"),
    t("pages_mall_限定周边"),
  ];

  const products = [
    {
      id: "m1",
      brand: "CHUTEA x NIKE",
      name: t("product_mall_air_force_1"),
      price: 12999,
      originalPrice: 14999,
      sold: "1.2k",
      image: "/images/products/mall_sneaker.jpg",
      tag: t("pages_mall_联名"),
      discount: "13% OFF",
      colors: [t("color_白色"), t("color_黑色")],
      sizes: ["40", "41", "42", "43"],
    },
    {
      id: "m2",
      brand: "CHUTEA",
      name: t("product_mall_logo_hoodie"),
      price: 4500,
      originalPrice: null,
      sold: "856",
      image: "/images/products/mall_hoodie.jpg",
      tag: t("pages_mall_新品"),
      discount: null,
      colors: [t("color_黑色"), t("color_白色"), t("color_灰色")],
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "m3",
      brand: "CHUTEA",
      name: t("product_mall_tea_set"),
      price: 7120,
      originalPrice: 8900,
      sold: "342",
      image: "/images/products/mall_teaset.jpg",
      tag: t("pages_mall_限时折扣"),
      discount: "20% OFF",
      colors: [t("color_青花瓷"), t("color_白瓷")],
      sizes: [t("size_标准")],
    },
    {
      id: "m4",
      brand: "CHUTEA",
      name: t("product_mall_tote_bag"),
      price: 1200,
      originalPrice: null,
      sold: "2.1k",
      image: "/images/products/mall_tote.jpg",
      tag: t("pages_mall_热销"),
      discount: null,
      colors: [t("color_米白"), t("color_黑色"), t("color_卡其")],
      sizes: [t("size_标准")],
    },
    {
      id: "m5",
      brand: "CHUTEA",
      name: t("product_mall_tumbler"),
      price: 1440,
      originalPrice: 1800,
      sold: "900",
      image: "/images/products/mall_tumbler.jpg",
      tag: t("pages_mall_特价"),
      discount: "20% OFF",
      colors: [t("color_透明"), t("color_粉色"), t("color_蓝色")],
      sizes: ["500ml"],
    },
    {
      id: "m6",
      brand: "CHUTEA",
      name: t("product_mall_gift_card"),
      price: 5000,
      originalPrice: null,
      sold: "156",
      image: "/images/products/mall_giftcard.jpg",
      tag: "",
      discount: null,
      colors: [t("size_标准")],
      sizes: ["₽5000"],
    },
  ];

  const filteredProducts = searchQuery
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const handleProductClick = (product: any) => {
    const modalProduct = {
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      description: `${product.brand} | ${t("pages_mall_已售")} ${product.sold}`,
      colors: product.colors,
      productSizes: product.sizes,
    };

    setSelectedProduct(modalProduct);
    setIsSpecModalOpen(true);
  };

  return (
    <MobileLayout>
      <div className="bg-gray-50 min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 bg-white z-40 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/">
              <ArrowLeft
                size={24}
                className="text-foreground cursor-pointer flex-shrink-0"
              />
            </Link>
            <div className="flex-1 bg-gray-100 h-9 rounded-md flex items-center px-3 gap-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder={t("pages_mall_搜索品牌商品")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Sub-nav */}
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className={cn(
                  "text-sm font-bold whitespace-nowrap cursor-pointer relative pb-1",
                  i === 0 ? "text-black" : "text-gray-400"
                )}
              >
                {cat}
                {i === 0 && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-black rounded-full" />
                )}
              </span>
            ))}
          </div>
        </header>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.tag && (
                  <div
                    className={cn(
                      "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white",
                      product.tag === t("pages_mall_联名")
                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                        : product.tag === t("pages_mall_新品")
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : product.tag === t("pages_mall_热销")
                            ? "bg-gradient-to-r from-orange-500 to-red-500"
                            : product.tag === t("pages_mall_限时折扣")
                              ? "bg-gradient-to-r from-red-500 to-orange-500"
                              : product.tag === t("pages_mall_特价")
                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                : "bg-gray-500"
                    )}
                  >
                    {product.tag}
                  </div>
                )}
                {product.discount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                    {product.discount}
                  </div>
                )}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const favorite = isFavorite(product.id);
                    if (favorite) {
                      removeFromFavorites(product.id);
                    } else {
                      addToFavorites({
                        id: product.id,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        type: "mall",
                        addedAt: Date.now(),
                      });
                    }
                  }}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-md"
                >
                  <Heart
                    size={16}
                    className={
                      isFavorite(product.id)
                        ? "fill-red-500 text-red-500"
                        : "text-gray-600"
                    }
                  />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {product.brand}
                </div>
                <h3 className="font-bold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold text-lg">
                        ₽ {product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          ₽ {product.originalPrice}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t("pages_mall_已售")} {product.sold}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Cart Bar */}
        {mallCartCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 bg-[#2c2c2c] px-4 py-3 flex items-center justify-between shadow-lg z-40">
            <div
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart size={24} className="text-white" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {mallCartCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">
                  {formatCurrency(
                    mallCart.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    )
                  )}
                </span>
                <span className="text-gray-400 text-xs">
                  {t("pages_mall_商城购物车")}
                </span>
              </div>
            </div>

            <Link href="/checkout?source=mall">
              <button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-full transition-colors">
                {t("pages_mall_去结算")}
              </button>
            </Link>
          </div>
        )}

        {/* Product Spec Modal */}
        {selectedProduct && (
          <ProductSpecModal
            open={isSpecModalOpen}
            onClose={() => {
              setIsSpecModalOpen(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            type="mall"
          />
        )}

        {/* Cart Drawer */}
        <CartDrawer
          open={isCartDrawerOpen}
          onClose={() => setIsCartDrawerOpen(false)}
          type="mall"
        />
      </div>
    </MobileLayout>
  );
}
