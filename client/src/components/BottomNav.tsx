import { Home, ShoppingBag, ShoppingCart, User, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: ShoppingBag, label: "Order", path: "/order" },
    { icon: ShoppingCart, label: "Mall", path: "/mall" },
    { icon: FileText, label: "Orders", path: "/orders" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer group">
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    isActive ? "text-primary fill-current" : "text-muted-foreground group-hover:text-primary/70"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
