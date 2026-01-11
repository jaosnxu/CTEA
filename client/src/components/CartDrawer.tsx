import { Minus, Plus, Trash2, ShoppingBag, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  type: "drink" | "mall";
}

export default function CartDrawer({ open, onClose, type }: CartDrawerProps) {
  const {
    drinkCart,
    mallCart,
    updateDrinkCartQuantity,
    updateMallCartQuantity,
    removeFromDrinkCart,
    removeFromMallCart,
    clearDrinkCart,
    clearMallCart
  } = useApp();
  
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const cart = type === "drink" ? drinkCart : mallCart;
  const updateQuantity = type === "drink" ? updateDrinkCartQuantity : updateMallCartQuantity;
  const removeItem = type === "drink" ? removeFromDrinkCart : removeFromMallCart;
  const clearCart = type === "drink" ? clearDrinkCart : clearMallCart;

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    onClose();
    setLocation("/checkout");
  };

  if (cart.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>购物车</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingBag size={64} className="text-gray-300 mb-4" />
            <p className="text-muted-foreground">{t("components_cartdrawer_购物车是空的")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("components_cartdrawer_快去选购心仪的商品吧")}</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm(t("components_cartdrawer_确定要清空购物车吗"))) {
                  clearCart();
                }
              }}
              className="text-sm text-red-500 hover:text-red-600 flex items-center"
            >
              <Trash2 size={16} className="mr-1" />
              {t("components_cartdrawer_清空")}
            </button>
            <SheetTitle className="absolute left-1/2 transform -translate-x-1/2">{t("components_cartdrawer_购物车")} ({totalItems})</SheetTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
              {/* Product Image */}
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1 truncate">{item.name}</h3>
                {item.specs && (
                  <p className="text-xs text-muted-foreground mb-1">{item.specs}</p>
                )}
                
                {/* 小料单独显示 */}
                {item.toppings && item.toppings.length > 0 && (
                  <div className="mb-2 space-y-0.5">
                    {item.toppings.map((topping, idx) => (
                      <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                        <span>{topping.name}</span>
                        <span className="text-primary font-medium">{formatCurrency(topping.price)}</span>
                        <span className="text-gray-400">x {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">{formatCurrency(item.price)}</span>
                  
                  {/* Quantity Control */}
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg bg-white">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          if (confirm(t("components_cartdrawer_确定要删除这个商品吗"))) {
                            removeItem(item.id);
                          }
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 transition-colors"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 size={14} className="text-red-500" />
                      ) : (
                        <Minus size={14} />
                      )}
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground">小计</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(totalPrice.toFixed(2))}</span>
          </div>
          <Button
            onClick={handleCheckout}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-full"
          >
            去结算
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
