/**
 * CHUTEA 智慧中台 - 四大支柱后台主布局
 *
 * 四大支柱：
 * 1. Финансы (财务) - 提现审批、跨店清算、保证金管理
 * 2. Маркетинг (营销) - 会员等级、SDUI广告、优惠券管理
 * 3. Операции (运营) - 门店配置、SKU管理、Telegram通知
 * 4. Интеллект (大脑) - AI简报、驾驶舱仪表盘
 */

import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Settings,
  Brain,
  Users,
  ShoppingBag,
  Store,
  MessageSquare,
  Bell,
  FileText,
  CreditCard,
  Gift,
  Target,
  Package,
  Truck,
  Bot,
  ChevronDown,
  ChevronRight,
  Globe,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// ==================== 类型定义 ====================

interface NavItem {
  id: string;
  label: { ru: string; zh: string };
  icon: ReactNode;
  href?: string;
  children?: NavItem[];
}

interface AdminLayoutProps {
  children: ReactNode;
}

type Language = "ru" | "zh";

// ==================== 导航配置 ====================

const navigationConfig: NavItem[] = [
  // 首页
  {
    id: "dashboard",
    label: { ru: "Панель управления", zh: "控制面板" },
    icon: <LayoutDashboard className="w-5 h-5" />,
    href: "/admin/dashboard",
  },
  // 财务支柱
  {
    id: "finance",
    label: { ru: "Финансы", zh: "财务" },
    icon: <Wallet className="w-5 h-5" />,
    children: [
      {
        id: "finance-withdrawals",
        label: { ru: "Вывод средств", zh: "提现审批" },
        icon: <CreditCard className="w-4 h-4" />,
        href: "/admin/finance/withdrawals",
      },
      {
        id: "finance-settlement",
        label: { ru: "Межмагазинный расчёт", zh: "跨店清算" },
        icon: <TrendingUp className="w-4 h-4" />,
        href: "/admin/finance/settlement",
      },
      {
        id: "finance-deposits",
        label: { ru: "Депозиты", zh: "保证金管理" },
        icon: <Wallet className="w-4 h-4" />,
        href: "/admin/finance/deposits",
      },
      {
        id: "finance-reports",
        label: { ru: "Финансовые отчёты", zh: "财务报表" },
        icon: <FileText className="w-4 h-4" />,
        href: "/admin/finance/reports",
      },
    ],
  },
  // 营销支柱
  {
    id: "marketing",
    label: { ru: "Маркетинг", zh: "营销" },
    icon: <Target className="w-5 h-5" />,
    children: [
      {
        id: "marketing-members",
        label: { ru: "Уровни участников", zh: "会员等级" },
        icon: <Users className="w-4 h-4" />,
        href: "/admin/marketing/members",
      },
      {
        id: "marketing-sdui",
        label: { ru: "Рекламные баннеры", zh: "SDUI广告" },
        icon: <Target className="w-4 h-4" />,
        href: "/admin/marketing/sdui",
      },
      {
        id: "marketing-coupons",
        label: { ru: "Купоны", zh: "优惠券管理" },
        icon: <Gift className="w-4 h-4" />,
        href: "/admin/marketing/coupons",
      },
      {
        id: "marketing-triggers",
        label: { ru: "Автоматизация", zh: "自动化触发器" },
        icon: <Bell className="w-4 h-4" />,
        href: "/admin/marketing/triggers",
      },
      {
        id: "marketing-influencers",
        label: { ru: "Инфлюенсеры", zh: "达人中心" },
        icon: <Users className="w-4 h-4" />,
        href: "/admin/marketing/influencers",
      },
    ],
  },
  // 运营支柱
  {
    id: "operations",
    label: { ru: "Операции", zh: "运营" },
    icon: <Store className="w-5 h-5" />,
    children: [
      {
        id: "ops-stores",
        label: { ru: "Управление магазинами", zh: "门店配置" },
        icon: <Store className="w-4 h-4" />,
        href: "/admin/ops/stores",
      },
      {
        id: "ops-products",
        label: { ru: "Товары и SKU", zh: "SKU管理" },
        icon: <Package className="w-4 h-4" />,
        href: "/admin/products",
      },
      {
        id: "ops-pricing-rules",
        label: { ru: "Правила ценообразования", zh: "定价规则" },
        icon: <Target className="w-4 h-4" />,
        href: "/admin/pricing-rules",
      },
      {
        id: "ops-orders",
        label: { ru: "Заказы", zh: "订单监控" },
        icon: <ShoppingBag className="w-4 h-4" />,
        href: "/admin/ops/orders",
      },
      {
        id: "ops-telegram",
        label: { ru: "Telegram уведомления", zh: "Telegram通知" },
        icon: <MessageSquare className="w-4 h-4" />,
        href: "/admin/ops/telegram",
      },
      {
        id: "ops-mall",
        label: { ru: "Торговый центр", zh: "购物中心" },
        icon: <Truck className="w-4 h-4" />,
        href: "/admin/ops/mall",
      },
    ],
  },
  // 大脑支柱
  {
    id: "intelligence",
    label: { ru: "Интеллект", zh: "大脑" },
    icon: <Brain className="w-5 h-5" />,
    children: [
      {
        id: "ai-cockpit",
        label: { ru: "AI Кокпит", zh: "AI驾驶舱" },
        icon: <Brain className="w-4 h-4" />,
        href: "/admin/ai/cockpit",
      },
      {
        id: "ai-reports",
        label: { ru: "AI Отчёты", zh: "AI简报" },
        icon: <FileText className="w-4 h-4" />,
        href: "/admin/ai/reports",
      },
      {
        id: "ai-customer-service",
        label: { ru: "AI Поддержка", zh: "AI客服" },
        icon: <Bot className="w-4 h-4" />,
        href: "/admin/ai/customer-service",
      },
    ],
  },
  // 系统设置
  {
    id: "system",
    label: { ru: "Система", zh: "系统" },
    icon: <Settings className="w-5 h-5" />,
    children: [
      {
        id: "system-settings",
        label: { ru: "Настройки", zh: "系统设置" },
        icon: <Settings className="w-4 h-4" />,
        href: "/admin/settings",
      },
      {
        id: "system-audit",
        label: { ru: "Журнал аудита", zh: "审计日志" },
        icon: <FileText className="w-4 h-4" />,
        href: "/admin/system/audit",
      },
      {
        id: "system-sms",
        label: { ru: "SMS логи", zh: "短信日志" },
        icon: <MessageSquare className="w-4 h-4" />,
        href: "/admin/system/sms-logs",
      },
    ],
  },
];

// ==================== 主组件 ====================

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [lang, setLang] = useState<Language>("ru");
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "finance",
    "marketing",
    "operations",
    "intelligence",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return location === href || location.startsWith(href + "/");
  };

  const isParentActive = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isParentActive(item);

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else if (item.href) {
              setLocation(item.href);
            }
          }}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
            ${depth > 0 ? "pl-12" : ""}
            ${
              active
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          <span className={active ? "text-white" : "text-gray-500"}>
            {item.icon}
          </span>
          <span className="flex-1 text-left font-medium">
            {item.label[lang]}
          </span>
          {hasChildren && (
            <span
              className={`transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
            >
              <ChevronDown className="w-4 h-4" />
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside
        className={`
        ${sidebarOpen ? "w-72" : "w-0"} 
        bg-white border-r border-gray-200 min-h-screen transition-all duration-300 overflow-hidden
        fixed lg:relative z-50
      `}
      >
        <div className="p-6 w-72">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-2xl">🧋</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">CHUTEA</h1>
              <p className="text-xs text-gray-500">
                {lang === "ru" ? "Панель администратора" : "管理后台"}
              </p>
            </div>
          </div>

          {/* 语言切换 */}
          <div className="mb-6 flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setLang("ru")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                lang === "ru"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => setLang("zh")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                lang === "zh"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🇨🇳 中文
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="space-y-1">
            {navigationConfig.map(item => renderNavItem(item))}
          </nav>

          {/* 底部退出 */}
          <div className="absolute bottom-6 left-6 right-6">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">
                {lang === "ru" ? "Выйти" : "退出登录"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-h-screen">
        {/* 顶部栏 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <div className="flex items-center gap-4">
              {/* 通知 */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* 用户头像 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div className="hidden md:block">
                  <p className="font-medium text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">
                    {lang === "ru" ? "Суперадмин" : "超级管理员"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-6">{children}</div>
      </main>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
