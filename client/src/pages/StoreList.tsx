import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Phone, Navigation } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface Store {
  id: string;
  name: string;
  address: string;
  distance: number;
  hours: string;
  phone: string;
  status: "open" | "closed";
}

const STORES: Store[] = [
  {
    id: "1",
    name: "CHUTEA Тверская",
    address: "Тверская улица 12, Москва",
    distance: 1.2,
    hours: "09:00 - 22:00",
    phone: "+7 495 123 4567",
    status: "open",
  },
  {
    id: "2",
    name: "CHUTEA Красная площадь",
    address: "Красная площадь 5, Москва",
    distance: 2.5,
    hours: "10:00 - 21:00",
    phone: "+7 495 234 5678",
    status: "open",
  },
  {
    id: "3",
    name: "CHUTEA МГУ",
    address: "МГУ, главное здание, западная сторона",
    distance: 4.8,
    hours: "08:00 - 23:00",
    phone: "+7 495 345 6789",
    status: "open",
  },
  {
    id: "4",
    name: "CHUTEA Шереметьево",
    address: "Аэропорт Шереметьево, терминал D",
    distance: 28.5,
    hours: "24 часа",
    phone: "+7 495 456 7890",
    status: "open",
  },
  {
    id: "5",
    name: "CHUTEA Арбат",
    address: "Арбат 18, Москва",
    distance: 3.2,
    hours: "09:00 - 22:00",
    phone: "+7 495 567 8901",
    status: "closed",
  },
];

export default function StoreList() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const sortedStores = [...STORES].sort((a, b) => {
    if (sortBy === "distance") {
      return a.distance - b.distance;
    }
    return a.name.localeCompare(b.name);
  });

  const handleSelectStore = (storeId: string) => {
    setSelectedStore(storeId);
    localStorage.setItem("selectedStore", storeId);
    setTimeout(() => {
      setLocation("/checkout?source=drink");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/checkout?source=drink">
            <ArrowLeft size={24} className="text-foreground cursor-pointer" />
          </Link>
          <h1 className="font-bold text-lg">{t("pages_storelist_选择门店")}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "distance" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("distance")}
            className="text-xs h-8"
          >
            {t("pages_storelist_按距离")}
          </Button>
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("name")}
            className="text-xs h-8"
          >
            {t("pages_storelist_按名称")}
          </Button>
        </div>
      </div>

      <div className="bg-white px-4 py-3 mb-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Navigation size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm">
            {t("pages_storelist_当前位置")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("pages_storelist_莫斯科市中心")}
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          {t("pages_storelist_重新定位")}
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {sortedStores.map(store => (
          <div
            key={store.id}
            onClick={() => handleSelectStore(store.id)}
            className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedStore === store.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base">{store.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      store.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {store.status === "open"
                      ? t("pages_storelist_营业中")
                      : t("pages_storelist_已打烊")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin size={14} />
                  <span>{store.address}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-primary font-bold text-sm">
                  {store.distance} {t("pages_storelist_公里")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("pages_storelist_约")} {Math.ceil(store.distance * 5)}{" "}
                  {t("pages_storelist_分钟")}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{store.hours}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={14} />
                  <span>{store.phone}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-7"
                onClick={e => {
                  e.stopPropagation();
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`,
                    "_blank"
                  );
                }}
              >
                {t("pages_storelist_导航")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
