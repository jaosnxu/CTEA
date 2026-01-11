import { User, Heart, MapPin, Gift, Settings, CreditCard, Star, PartyPopper, ShieldCheck, Camera, ChevronRight } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import InstallPWA from "@/components/InstallPWA";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useApp, MEMBER_LEVELS } from "@/contexts/AppContext";
import { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Profile() {
  const { isInstalled, canInstall } = usePWAInstall();
  const { userProfile } = useApp();
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string>("/images/default-avatar.jpg");
  
  const currentLevel = MEMBER_LEVELS[userProfile.level];
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
          localStorage.setItem("userAvatar", event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const menuItems = [
    { title: t("pages_profile_我的优惠券"), icon: Gift, path: "/coupons", badge: t("pages_profile_3张可用") },
    { title: t("pages_profile_我的礼品卡"), icon: CreditCard, path: "/gift-cards", badge: "" },
    { title: t("pages_profile_活动中心"), icon: PartyPopper, path: "/activity-center", badge: t("pages_profile_新") },
    { title: t("pages_profile_会员中心"), icon: Star, path: "/membership", badge: t(`member_level_${userProfile.level}`) },
    { title: t("pages_profile_我的收藏"), icon: Heart, path: "/favorites", badge: "" },
    { title: t("pages_profile_我的地址"), icon: MapPin, path: "/addresses", badge: "" },
    { title: t("pages_profile_达人中心"), icon: ShieldCheck, path: "/influencer", badge: "" },
    { title: t("pages_profile_设置"), icon: Settings, path: "/settings", badge: "" },
  ];

  return (
    <MobileLayout>
      <div className="bg-gray-50 min-h-full">
        {/* Header with Centered Avatar */}
        <div className="bg-white px-6 pt-12 pb-8">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              {/* Upload Button */}
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                <Camera size={16} className="text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* User Info */}
            <h2 className="text-xl font-bold mb-1">{userProfile.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
                style={{ backgroundColor: currentLevel.color }}
              >
                {userProfile.level === "Platinum" ? "💎" : 
                 userProfile.level === "Gold" ? "🏆" : 
                 userProfile.level === "Silver" ? "⭐" : "👤"}
                <span className="text-[11px]">{t(`member_level_${userProfile.level}`)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("pages_profile_累计消费")} {formatCurrency(userProfile.totalSpent.toFixed(2))}</span>
            </div>
            
            {/* PWA Install Status */}
            {isInstalled && (
              <div className="mt-3 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <span>✓</span>
                <span>{t("pages_profile_已安装")}</span>
              </div>
            )}
          </div>
        </div>

        {/* PWA Install Card */}
        {canInstall && !isInstalled && (
          <div className="px-4 py-4">
            <div className="bg-gradient-to-r from-black to-gray-800 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold text-black">C</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{t("pages_profile_安装chutea应用")}</h3>
                  <p className="text-sm text-white/80 mb-3">
                    {t("pages_profile_添加到主屏幕享受更流畅的原生体验")}
                  </p>
                  <InstallPWA />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu List */}
        <div className="px-4 py-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {menuItems.map((item, index) => (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
                  index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-all">
                      <item.icon size={20} className="text-gray-600 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        item.badge === t("pages_profile_新") 
                          ? "bg-red-500 text-white" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Version */}
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">VERSION 1.2.0</p>
        </div>
      </div>
    </MobileLayout>
  );
}
