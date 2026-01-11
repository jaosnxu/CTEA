import { useState } from "react";
import { MapPin, ChevronDown, ShoppingBag, Truck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { city, setCity } = useApp();
  const { t } = useLanguage();
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);

  const cities = [
    t("pages_home_莫斯科"),
    t("pages_home_圣彼得堡"),
    t("pages_home_喀山"),
    t("pages_home_索契")
  ];

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] bg-white overflow-hidden">
        {/* 1. Top Section: Header & City */}
        <div className="flex-none bg-white px-5 py-4 flex justify-between items-center z-20">
          <div className="relative">
            <button 
              onClick={() => setIsCityMenuOpen(!isCityMenuOpen)}
              className="flex items-center gap-1.5 font-bold text-xl text-black"
            >
              <MapPin size={22} className="text-black" />
              {city}
              <ChevronDown size={18} className={cn("transition-transform text-gray-400", isCityMenuOpen ? "rotate-180" : "")} />
            </button>
            
            {isCityMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                {cities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCity(c);
                      setIsCityMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 font-medium text-sm transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        </div>

        {/* 2. Middle Section: Hero Visual (Flexible Height) */}
        <div className="flex-1 relative w-full bg-gray-100 overflow-hidden mx-4 rounded-2xl mb-4 self-center max-w-[calc(100%-2rem)]">
          <img 
            src="/images/banners/home_banner.jpg" 
            alt="CHUTEA Brand" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="text-3xl font-bold mb-1 drop-shadow-md">CHUTEA</h1>
            <p className="text-sm font-medium opacity-90 drop-shadow-md">{t("pages_home_重新定义新中式茶饮")}</p>
          </div>
        </div>

        {/* 3. Bottom Section: Core Actions & Membership */}
        <div className="flex-none px-4 pb-6 space-y-4">
          {/* Order Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/order">
              <div className="flex flex-col items-center justify-center gap-3 p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer h-32 border border-gray-100">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-sm">
                  <ShoppingBag size={22} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-lg text-black block">{t("pages_home_菜单")}</span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">{t("pages_home_提前点单_免排队")}</span>
                </div>
              </div>
            </Link>
            <Link href="/mall">
              <div className="flex flex-col items-center justify-center gap-3 p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer h-32 border border-gray-100">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-sm">
                  <Truck size={22} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-lg text-black block">{t("pages_home_严选好物")}</span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">{t("pages_home_品质商品_精心精选")}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Membership Card */}
          <Link href="/profile">
            <div className="bg-[#1A1A1A] rounded-2xl p-4 text-white flex justify-between items-center active:scale-[0.99] transition-transform cursor-pointer shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Star className="fill-white text-white" size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm">{t("pages_home_chutea_会员俱乐部")}</div>
                  <p className="text-[10px] text-white/60 mt-0.5">{t("pages_home_立即加入_首单享_5_折优惠")}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="bg-white text-black border-none hover:bg-gray-200 rounded-full h-8 text-xs font-bold px-4">
                {t("pages_home_加入")}
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </MobileLayout>
  );
}
