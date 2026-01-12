import { useState } from "react";
import { ArrowLeft, Ticket, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Coupons() {
  const { coupons, addCoupon } = useApp();
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "used" | "expired">(
    "active"
  );

  const handleRedeem = () => {
    if (!code) return;
    if (code.toUpperCase() === "CHUTEA2025") {
      addCoupon({
        id: `c_${Date.now()}`,
        name: t("pages_coupons_兑换码专享券"),
        discount: 15,
        minAmount: 0,
        validUntil: "2025-12-31",
        available: true,
        description: t("pages_coupons_全场通用"),
      });
      toast.success(t("pages_coupons_兑换成功"));
      setCode("");
    } else {
      toast.error(t("pages_coupons_无效的兑换码"));
    }
  };

  const filteredCoupons =
    activeTab === "active"
      ? coupons.filter(c => c.available)
      : coupons.filter(c => !c.available);

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/profile">
            <ArrowLeft size={24} className="text-foreground cursor-pointer" />
          </Link>
          <h1 className="font-bold text-lg">{t("pages_coupons_我的优惠券")}</h1>
        </div>

        {/* Redeem Section */}
        <div className="bg-white p-4 mb-2">
          <div className="flex gap-2">
            <Input
              placeholder={t("pages_coupons_请输入兑换码")}
              value={code}
              onChange={e => setCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleRedeem} disabled={!code}>
              {t("pages_coupons_兑换")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white px-4 border-b border-gray-100 mb-4">
          <div className="flex">
            {[
              { id: "active", label: t("pages_coupons_未使用") },
              { id: "used", label: t("pages_coupons_已使用") },
              { id: "expired", label: t("pages_coupons_已过期") },
            ].map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 text-center py-3 text-sm font-medium relative cursor-pointer",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coupon List */}
        <div className="px-4 space-y-3">
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket size={48} className="mx-auto mb-2 opacity-20" />
              <p>{t("pages_coupons_暂无相关优惠券")}</p>
            </div>
          ) : (
            filteredCoupons.map(coupon => (
              <div
                key={coupon.id}
                className={cn(
                  "bg-white rounded-xl overflow-hidden flex shadow-sm relative",
                  activeTab !== "active" && "opacity-60 grayscale"
                )}
              >
                {/* Left Side */}
                <div className="bg-primary/10 w-24 flex flex-col items-center justify-center p-2 text-primary border-r border-dashed border-primary/30 relative">
                  <span className="text-xs font-bold">₽</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(coupon.discount)}
                  </span>
                  <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-gray-50 rounded-full" />
                  <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-gray-50 rounded-full" />
                </div>

                {/* Right Side */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs mb-1">{coupon.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {coupon.description ||
                        `${t("pages_coupons_满")}${formatCurrency(coupon.minAmount)}${t("pages_coupons_可用")}`}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {t("pages_coupons_有效期至")} {coupon.validUntil}
                    </span>
                    {activeTab === "active" && (
                      <Link href="/order">
                        <Button
                          size="sm"
                          className="h-6 text-xs rounded-full px-3"
                        >
                          {t("pages_coupons_去使用")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Status Icon */}
                {activeTab === "used" && (
                  <CheckCircle2
                    className="absolute right-2 top-2 text-gray-300"
                    size={40}
                  />
                )}
                {activeTab === "expired" && (
                  <AlertCircle
                    className="absolute right-2 top-2 text-gray-300"
                    size={40}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
