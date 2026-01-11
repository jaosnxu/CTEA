import { ArrowLeft, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Favorites() {
  const { favorites, removeFromFavorites, addToDrinkCart, addToMallCart } = useApp();
  const { t, language } = useLanguage();

  const handleQuickAdd = (item: typeof favorites[0]) => {
    if (item.type === "drink") {
      addToDrinkCart({
        productId: item.id,
        quantity: 1,
        specs: t("pages_favorites_标准")
      });
    } else {
      addToMallCart({
        productId: item.id,
        quantity: 1,
        specs: t("pages_favorites_默认规格")
      });
    }
  };

  const handleRemove = (id: string) => {
    removeFromFavorites(id);
    toast.success(t("pages_favorites_已取消收藏"));
  };

  const formatDate = (timestamp: number) => {
    const locale = language === "ru" ? "ru-RU" : language === "zh" ? "zh-CN" : "en-US";
    return new Date(timestamp).toLocaleDateString(locale);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/profile">
          <ArrowLeft size={24} className="text-foreground cursor-pointer" />
        </Link>
        <h1 className="font-bold text-lg">{t("pages_favorites_我的收藏")}</h1>
        <div className="ml-auto text-sm text-muted-foreground">
          {favorites.length} {t("pages_favorites_件商品")}
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Heart size={40} className="text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg mb-2">{t("pages_favorites_暂无收藏")}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t("pages_favorites_快去收藏喜欢的商品吧")}</p>
          <div className="flex gap-3">
            <Link href="/order">
              <Button variant="outline">{t("pages_favorites_去点单")}</Button>
            </Link>
            <Link href="/mall">
              <Button>{t("pages_favorites_逛商城")}</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {favorites.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm mb-1 truncate">{item.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {item.type === "drink" ? t("pages_favorites_饮品") : t("pages_favorites_商城")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.addedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-lg">{formatCurrency(item.price)}</span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleQuickAdd(item)}
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                      >
                        <ShoppingCart size={12} className="mr-1" />
                        {t("pages_favorites_加购")}
                      </Button>
                      <Button
                        onClick={() => handleRemove(item.id)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
