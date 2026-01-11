import { Link, useLocation } from "wouter";
import { Home, Coffee, ShoppingBag, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations, t } from "@/lib/i18n";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const { language } = useLanguage();

  const tabs = [
    { name: translations.home, path: "/", icon: Home },
    { name: translations.order, path: "/order", icon: Coffee },
    { name: translations.mall, path: "/mall", icon: ShoppingBag },
    { name: translations.orders, path: "/orders", icon: ClipboardList },
    { name: translations.profile, path: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {children}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 flex justify-between items-center z-50 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          return (
            <Link key={tab.path} href={tab.path}>
              <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <tab.icon 
                  size={28} 
                  className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-primary stroke-[2.5px]" : "text-gray-400 group-hover:text-gray-500"
                  )} 
                />
                <span className={cn(
                  "text-[9px] font-medium transition-colors duration-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center",
                  isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500"
                )}>
                  {t(tab.name, language)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
