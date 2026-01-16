import { useState, useRef, useEffect } from "react";
import { Search, MapPin, ShoppingCart, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useApp, PRODUCTS, CATEGORIES } from "@/contexts/AppContext";
import ProductSpecModal from "@/components/ProductSpecModal";
import CartDrawer from "@/components/CartDrawer";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Order() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const {
    drinkCart,
    drinkCartCount,
    products,
    isLoadingProducts,
    productsError,
  } = useApp();
  const { t } = useLanguage();

  // Refs for scroll sync
  const productListRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // 左侧点击 -> 右侧滚动
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);

    const categoryElement = categoryRefs.current[categoryId];
    if (categoryElement && productListRef.current) {
      isScrollingProgrammatically.current = true;

      const offsetTop = categoryElement.offsetTop - 16;
      productListRef.current.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 800);
    }
  };

  // 右侧滚动 -> 左侧高亮
  useEffect(() => {
    const productList = productListRef.current;
    if (!productList) return;

    const observer = new IntersectionObserver(
      entries => {
        if (isScrollingProgrammatically.current) return;

        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const categoryId = entry.target.getAttribute("data-category-id");
            if (categoryId) {
              setActiveCategory(categoryId);
            }
          }
        });
      },
      {
        root: productList,
        threshold: [0, 0.5, 1],
        rootMargin: "-20% 0px -60% 0px",
      }
    );

    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Filter products by search query
  const filteredProducts = searchQuery
    ? PRODUCTS.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PRODUCTS;

  const groupedProducts = CATEGORIES.map(cat => ({
    ...cat,
    products: filteredProducts.filter(p => p.category === cat.id),
  })).filter(cat => cat.products.length > 0);

  const handleProductClick = (product: any) => {
    // Convert PRODUCTS format to ProductSpecModal format
    const modalProduct = {
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      description: product.desc,
      calories: product.energy,
      sugar: product.sugar,
      sizes: [
        { name: "Средний", price: product.price },
        { name: "Большой", price: product.price + 5 },
      ],
      temperatures: ["Холодный", "Мало льда", "Без льда", "Горячий"],
      sweetness: ["Без сахара", "Меньше", "Стандарт", "Больше сахара"],
      toppings: [
        { name: "Тапиока", price: 3 },
        { name: "Кокос", price: 3 },
        { name: "Пудинг", price: 4 },
        { name: "Красная фасоль", price: 3 },
      ],
    };

    setSelectedProduct(modalProduct);
    setIsSpecModalOpen(true);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-3 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <Link href="/">
              <ArrowLeft size={24} className="text-foreground cursor-pointer" />
            </Link>

            {/* Location */}
            <Link href="/stores" className="flex-1">
              <div className="flex items-center gap-2 cursor-pointer">
                <MapPin size={20} className="text-primary" />
                <span className="font-bold">
                  {t("pages_order_莫斯科_go_店")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("pages_order_距离_12_km")}
                </span>
              </div>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder={t("pages_order_Поиск напитков")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Data Source Indicator */}
        {!isLoadingProducts && products.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-800">
              📦 数据来源: MySQL 数据库（{products.length} 款产品）
            </p>
            <p className="text-xs text-blue-600 mt-1">
              💡 后台修改后会自动刷新
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingProducts && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <p className="text-sm text-yellow-800">⏳ 正在加载产品数据...</p>
          </div>
        )}

        {/* Error State */}
        {productsError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <p className="text-sm text-red-800">❌ 加载失败: {productsError}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-24 bg-white overflow-y-auto flex-shrink-0">
            {groupedProducts.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "w-full px-2 py-4 text-sm transition-colors relative",
                  activeCategory === category.id
                    ? "bg-gray-50 text-primary font-bold"
                    : "text-muted-foreground hover:bg-gray-50"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-xs">{category.name}</span>
                </div>
                {activeCategory === category.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Right Product List */}
          <div
            ref={productListRef}
            className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-6"
          >
            {groupedProducts.map(category => (
              <div
                key={category.id}
                ref={el => {
                  categoryRefs.current[category.id] = el;
                }}
                data-category-id={category.id}
              >
                <h2 className="font-bold text-lg mb-3 sticky top-0 bg-gray-50 py-2 z-10">
                  {category.name}
                </h2>
                <div className="space-y-3">
                  {category.products.map(product => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        onClick={() => setLocation(`/product/${product.id}`)}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <h3
                          onClick={() => setLocation(`/product/${product.id}`)}
                          className="font-bold mb-1 truncate cursor-pointer hover:text-primary transition-colors"
                        >
                          {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {product.desc}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-bold">
                            {formatCurrency(product.price)}
                          </span>
                          <button
                            onClick={() => handleProductClick(product)}
                            className="px-4 py-1.5 bg-primary text-white text-xs rounded-full hover:bg-primary/90 transition-colors"
                          >
                            加购
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Cart Bar */}
        {drinkCartCount > 0 && (
          <div className="fixed bottom-14 left-0 right-0 bg-[#2c2c2c] px-4 py-3 flex items-center justify-between shadow-lg z-40">
            {/* Left: Cart Icon, Count, and Total Price */}
            <div
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart size={24} className="text-white" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {drinkCartCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">
                  {formatCurrency(
                    drinkCart.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    )
                  )}
                </span>
                <span className="text-gray-400 text-xs">
                  另需配送费约 {formatCurrency(3)}-{formatCurrency(5)}
                </span>
              </div>
            </div>

            {/* Right: Checkout Button */}
            <Link href="/checkout?source=drink">
              <button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-full transition-colors">
                去结算
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
            type="drink"
          />
        )}

        {/* Cart Drawer */}
        <CartDrawer
          open={isCartDrawerOpen}
          onClose={() => setIsCartDrawerOpen(false)}
          type="drink"
        />
      </div>
    </MobileLayout>
  );
}
