import { ArrowLeft, Star, Crown, Gift, Coffee, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useApp, MEMBER_LEVELS } from "@/contexts/AppContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Membership() {
  const { userProfile, userPoints } = useApp();
  const { t } = useLanguage();

  const currentLevel = MEMBER_LEVELS[userProfile.level];

  const getNextLevel = () => {
    if (userProfile.level === "Platinum") return null;
    if (userProfile.level === "Gold") return MEMBER_LEVELS.Platinum;
    if (userProfile.level === "Silver") return MEMBER_LEVELS.Gold;
    return MEMBER_LEVELS.Silver;
  };

  const nextLevel = getNextLevel();
  const progress = nextLevel
    ? (userProfile.totalSpent / nextLevel.threshold) * 100
    : 100;
  const remainingAmount = nextLevel
    ? nextLevel.threshold - userProfile.totalSpent
    : 0;

  const benefits = currentLevel.benefits.map((benefit, index) => {
    const icons = [Star, Gift, Crown, TrendingUp];
    return {
      icon: icons[index] || Star,
      title: benefit,
      desc: benefit,
    };
  });

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white pb-12 pt-4 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <Link href="/profile">
              <ArrowLeft size={24} className="text-white cursor-pointer" />
            </Link>
            <h1 className="font-bold text-lg">
              {t("pages_membership_会员中心")}
            </h1>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${currentLevel.color}40` }}
              >
                {userProfile.level === "Platinum"
                  ? "💎"
                  : userProfile.level === "Gold"
                    ? "🏆"
                    : userProfile.level === "Silver"
                      ? "⭐"
                      : "👤"}
              </div>
              <div>
                <h2 className="font-bold text-xl">{userProfile.name}</h2>
                <p className="text-white/70 text-sm">
                  {t("pages_membership_当前等级")}:{" "}
                  {t(`member_level_${userProfile.level}`)}
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              {nextLevel ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span>
                      {t("pages_membership_累计消费")}{" "}
                      {formatCurrency(userProfile.totalSpent.toFixed(2))}/
                      {formatCurrency(nextLevel.threshold)}
                    </span>
                    <span>
                      {t("pages_membership_距离升级还需")}
                      {formatCurrency(remainingAmount.toFixed(2))}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(progress, 100)}
                    className="h-2 bg-white/20"
                  />
                  <p className="text-xs text-white/60 mt-2">
                    {t("pages_membership_再消费")}{" "}
                    {formatCurrency(remainingAmount.toFixed(2))}{" "}
                    {t("pages_membership_即可升级至")}
                    {t(`member_level_${nextLevel.name}`)}
                  </p>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm">
                    🎉 {t("pages_membership_恭喜最高等级")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 -mt-8 relative z-20">
          <div className="bg-white rounded-xl p-5 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("pages_membership_当前积分")}
              </p>
              <h3 className="text-3xl font-bold text-primary">{userPoints}</h3>
            </div>
            <Link href="/mall">
              <button className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold">
                {t("pages_membership_去兑换")}
              </button>
            </Link>
          </div>
        </div>

        <div className="px-4 mt-6">
          <h3 className="font-bold text-lg mb-4">
            {t("pages_membership_会员权益")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((item, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center text-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon size={20} />
                </div>
                <h4 className="font-bold text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mt-6">
          <h3 className="font-bold text-lg mb-4">
            {t("pages_membership_积分明细")}
          </h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {[
              {
                title:
                  t("pages_membership_购买商品") +
                  " - " +
                  t("product_多肉葡萄冻"),
                date: "2025-01-08",
                points: "+29",
              },
              {
                title: t("pages_membership_每日签到"),
                date: "2025-01-08",
                points: "+5",
              },
              {
                title: t("pages_membership_积分抵扣"),
                date: "2025-01-07",
                points: "-100",
              },
              {
                title:
                  t("pages_membership_购买商品") +
                  " - " +
                  t("product_芝芝莓莓"),
                date: "2025-01-05",
                points: "+28",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 border-b border-gray-50 last:border-none flex justify-between items-center"
              >
                <div>
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <span
                  className={cn(
                    "font-bold",
                    item.points.startsWith("+")
                      ? "text-primary"
                      : "text-gray-900"
                  )}
                >
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
