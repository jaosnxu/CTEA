import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coffee, ShoppingBag, Gift, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden bg-muted">
        <img
          src="/images/products/strawberry_cheeso.png"
          alt="Seasonal Special"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />
        
        {/* Floating Promo Cards - Top */}
        <div className="absolute top-12 left-4 right-4 flex gap-3 overflow-x-auto no-scrollbar py-2">
          {[t("home.tags.new_arrival"), t("home.tags.seasonal"), t("home.tags.best_seller")].map((tag, i) => (
            <div key={i} className="flex-shrink-0 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-medium shadow-sm">
              {tag}
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-8 left-6 text-white">
          <div className="flex items-center gap-2 mb-2">
             <img src="/images/logo.png" alt="CHU TEA" className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm p-1" />
             <img src="/images/brand_text.png" alt="CHU TEA" className="h-6 brightness-0 invert" />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">{t("home.hero_title")}</h1>
          <p className="text-white/90 text-sm font-medium">{t("home.hero_desc")}</p>
        </div>
      </div>

      {/* Main Action Area - Floating Card */}
      <div className="relative -mt-6 px-4 z-10">
        <Card className="p-6 shadow-lg border-none bg-white/95 backdrop-blur-sm rounded-[20px]">
          {/* Member Status */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                <img src="/images/logo.png" alt="User" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{t("home.member_level")}</span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold">VIP.1</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("home.unlock_vip")}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <QrCodeIcon />
            </Button>
          </div>

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/order">
              <div className="bg-secondary/50 hover:bg-secondary transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-3 h-32 cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Coffee className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base">{t('home.pickup')}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t('home.pickup_desc')}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/order">
              <div className="bg-secondary/50 hover:bg-secondary transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-3 h-32 cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base">{t('home.delivery')}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t('home.delivery_desc')}</p>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Secondary Actions */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        <SecondaryCard title={t('home.gift_card')} subtitle={t('home.gift_card_desc')} icon={Gift} color="bg-pink-50" />
        <SecondaryCard title={t('home.group_order')} subtitle={t('home.group_order_desc')} icon={Coffee} color="bg-orange-50" />
        <SecondaryCard title={t('home.wallet')} subtitle={t('home.wallet_desc')} icon={CreditCard} color="bg-blue-50" />
      </div>
    </div>
  );
}

function SecondaryCard({ title, subtitle, icon: Icon, color }: { title: string, subtitle: string, icon: any, color: string }) {
  return (
    <div className={`${color} rounded-xl p-3 flex flex-col justify-between h-24 cursor-pointer hover:opacity-90 transition-opacity`}>
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-[10px] text-muted-foreground/80">{subtitle}</p>
      </div>
      <div className="self-end">
        <Icon className="w-4 h-4 opacity-50" />
      </div>
    </div>
  );
}

function QrCodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3H9V9H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 3H21V9H15V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 15H21V21H15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 15H9V21H3V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
