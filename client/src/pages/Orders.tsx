import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Orders() {
  const { orders } = useApp();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [orderType, setOrderType] = useState<"all" | "drink" | "mall">("all");

  const mockOrders =
    orders.length > 0
      ? orders
      : [
          {
            id: "1",
            items: [
              {
                id: "1",
                name: t("product_芝芝草莓"),
                price: 28,
                image: "/images/products/drink_01.png",
                category: "drink",
                desc: t("product_desc_芝芝草莓"),
                energy: 320,
                sugar: 22,
                likes: 1200,
                reviews: 856,
                quantity: 1,
                specs: t("spec_中杯_冰_标准糖"),
                toppings: [{ name: t("topping_珍珠"), price: 3 }],
              },
            ],
            total: 31,
            status: "completed" as const,
            date: "2026-01-09 14:30",
            createdAt: Date.now() - 86400000,
            type: "pickup" as const,
            source: "drink" as const,
            pickupCode: "T1234",
          },
          {
            id: "2",
            items: [
              {
                id: "mall_1",
                name: t("product_mall_air_force_1"),
                price: 12999,
                image: "/images/mall/shoe_01.png",
                category: "mall",
                desc: "CHUTEA x NIKE",
                energy: 0,
                sugar: 0,
                likes: 2400,
                reviews: 1250,
                quantity: 1,
                specs: t("spec_白色_40码"),
              },
            ],
            total: 12999,
            status: "preparing" as const,
            date: "2026-01-10 10:15",
            createdAt: Date.now() - 3600000,
            type: "delivery" as const,
            source: "mall" as const,
            pickupCode: "T5678",
          },
          {
            id: "3",
            items: [
              {
                id: "2",
                name: t("product_满杯红柚"),
                price: 22,
                image: "/images/products/drink_02.png",
                category: "drink",
                desc: t("product_desc_满杯红柚"),
                energy: 280,
                sugar: 18,
                likes: 980,
                reviews: 654,
                quantity: 2,
                specs: t("spec_大杯_冰_少糖"),
              },
            ],
            total: 44,
            status: "completed" as const,
            date: "2026-01-08 16:45",
            createdAt: Date.now() - 172800000,
            type: "pickup" as const,
            source: "drink" as const,
            pickupCode: "T9012",
          },
        ];

  const filteredOrders =
    orderType === "all"
      ? mockOrders
      : mockOrders.filter(order => order.source === orderType);

  const tabs = ["all", "drink", "mall"];
  const tabLabels = {
    all: t("pages_orders_全部"),
    drink: t("pages_orders_饮品订单"),
    mall: t("pages_orders_严选好物"),
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <h1 className="font-bold text-lg">{t("pages_orders_我的订单")}</h1>
        </div>

        <div className="bg-white px-4 border-b border-gray-100">
          <div className="flex">
            {tabs.map(tab => (
              <div
                key={tab}
                onClick={() => setOrderType(tab as "all" | "drink" | "mall")}
                className={cn(
                  "flex-1 text-center py-3 text-sm font-medium relative cursor-pointer",
                  orderType === tab ? "text-teal-600" : "text-gray-500"
                )}
              >
                {tabLabels[tab as keyof typeof tabLabels]}
                {orderType === tab && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-600 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                🥤
              </div>
              <h3 className="font-bold text-lg mb-2">
                {t("pages_orders_暂无订单")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("pages_orders_快去点一杯喜欢的饮品吧")}
              </p>
              <Link href="/order">
                <button className="bg-primary text-white px-8 py-2 rounded-full font-bold text-sm">
                  {t("pages_orders_去点单")}
                </button>
              </Link>
            </div>
          ) : (
            filteredOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {order.source === "mall"
                          ? t("pages_orders_严选好物")
                          : t("pages_orders_莫斯科go店")}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          order.source === "mall"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-teal-100 text-teal-600"
                        )}
                      >
                        {order.source === "mall"
                          ? t("pages_orders_商城")
                          : t("pages_orders_饮品")}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        order.status === "completed"
                          ? "text-muted-foreground"
                          : "text-primary"
                      )}
                    >
                      {order.status === "preparing"
                        ? t("pages_orders_制作中")
                        : t("pages_orders_已完成")}
                    </span>
                  </div>

                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 mb-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-sm">
                            {item.name}
                          </span>
                          <span className="font-bold text-sm">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.specs} x{item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Pickup Code */}
                  {order.pickupCode && (
                    <div className="flex flex-col items-center justify-center gap-1 py-3 border-t border-gray-100 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {t("pages_orders_取单码")}
                      </span>
                      <span className="text-2xl font-bold text-primary tracking-wider">
                        {order.pickupCode}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {order.date}
                    </span>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-bold mr-2">
                        {t("pages_orders_合计")} {formatCurrency(order.total)}
                      </span>
                      <button className="px-3 py-1.5 border border-primary text-primary rounded-full text-xs font-medium">
                        {t("pages_orders_再来一单")}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
