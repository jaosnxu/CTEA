import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Clock, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface OrderItem {
  productId: number;
  productName: string;
  variant: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  prefix: "T" | "P" | "K" | "M";
  items: OrderItem[];
  total: number;
  status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED" | "VOIDED";
  createdAt: string;
}

export default function Orders() {
  const { t, i18n } = useTranslation();
  
  // tRPC Query with auto-revalidation
  const { data: orders = [], isLoading: loading } = trpc.orders.list.useQuery();

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return i18n.language === "ru" ? "Ожидание" : "Pending";
      case "PAID": return i18n.language === "ru" ? "Оплачено" : "Paid";
      case "COMPLETED": return i18n.language === "ru" ? "Завершен" : "Completed";
      case "CANCELLED": return i18n.language === "ru" ? "Отменено" : "Cancelled";
      case "VOIDED": return i18n.language === "ru" ? "Возврат" : "Voided";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "text-orange-500 bg-orange-50";
      case "PAID": return "text-blue-500 bg-blue-50";
      case "COMPLETED": return "text-gray-500 bg-gray-100";
      case "CANCELLED": return "text-red-500 bg-red-50";
      case "VOIDED": return "text-red-500 bg-red-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language === "ru" ? "ru-RU" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F8F8F8] p-4 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-center">{t("nav.orders")}</h1>
      </div>

      <div className="p-4 space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="border-none shadow-sm rounded-[20px] overflow-hidden">
            <div className="p-4 bg-white">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    {order.prefix}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {order.prefix === "M" ? t("home.pickup") : t("home.delivery")}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                        <div className="text-xs text-gray-500">{item.variant} x{item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">₽{item.price}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-500">
                  Order ID: {order.id}
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 mr-2">{t("order.total")}</span>
                  <span className="text-lg font-bold">₽{order.total}</span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="mt-4 flex justify-end gap-2">
                <button className="px-4 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Invoice
                </button>
                <button className="px-4 py-1.5 bg-black text-white rounded-full text-xs font-medium hover:bg-gray-800">
                  Reorder
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
