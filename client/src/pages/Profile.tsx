import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  MapPin,
  Settings,
  ShieldCheck,
  Ticket,
  User,
  Wallet
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const { t, i18n } = useTranslation();
  
  // Use tRPC to fetch user profile instead of raw fetch
  const { data: user, isLoading } = trpc.user.me.useQuery();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "zh" ? "en" : i18n.language === "en" ? "ru" : "zh";
    i18n.changeLanguage(nextLang);
  };

  const getLangLabel = () => {
    switch (i18n.language) {
      case "zh": return "中文";
      case "en": return "English";
      case "ru": return "Русский";
      default: return "Русский";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Section */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="w-16 h-16 border-2 border-white shadow-md">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.name || "Любитель Чая"}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-black text-white text-xs font-bold rounded-full">
                {user?.level || "VIP.1"}
              </span>
              <span className="text-sm text-gray-500">{user?.phone || ""}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-400">
            <Settings className="w-6 h-6" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{user?.balance || 0}</div>
            <div className="text-xs text-gray-500">{t("home.wallet")}</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{user?.coupons || 0}</div>
            <div className="text-xs text-gray-500">{t("profile.coupons")}</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{user?.points || 0}</div>
            <div className="text-xs text-gray-500">{t("profile.points")}</div>
          </div>
        </div>
      </div>

      {/* Membership Card */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-sm text-gray-300 mb-1">{t("profile.current_level")}</div>
              <div className="text-2xl font-bold italic">CHU CLUB</div>
            </div>
            <ShieldCheck className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="flex justify-between items-end">
            <div className="text-xs text-gray-400">
              {t("profile.upgrade_tip")}
            </div>
            <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-yellow-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-4 mt-6 space-y-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-0 divide-y divide-gray-100">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.my_addresses")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.my_coupons")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.payment_methods")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-0 divide-y divide-gray-100">
            <button 
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">{t("profile.language")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">{getLangLabel()}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.kol_center")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.notifications")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{t("profile.help_support")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </CardContent>
        </Card>
        
        <div className="text-center text-xs text-gray-300 py-4">
          v1.0.0 • Powered by Manus
        </div>
      </div>
    </div>
  );
}
