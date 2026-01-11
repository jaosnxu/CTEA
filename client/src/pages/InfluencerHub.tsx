import { ChevronLeft, Settings, User, Calendar, Trophy, ClipboardList, FolderOpen, Lightbulb, ArrowRight, CheckCircle2, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InfluencerHub() {
  const { influencerData, withdrawFunds } = useApp();
  const { t } = useLanguage();

  const handleWithdraw = () => {
    if (influencerData.balance <= 0) {
      toast.error(t("pages_influencer_暂无余额可提现"));
      return;
    }
    withdrawFunds();
    toast.success(t("pages_influencer_提现申请已提交"));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task": return CheckCircle2;
      case "referral": return UserPlus;
      case "withdraw": return Wallet;
      default: return CheckCircle2;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task": return "text-green-500";
      case "referral": return "text-blue-500";
      case "withdraw": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto shadow-2xl relative flex flex-col">
      <header className="bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <h1 className="font-bold text-lg">{t("pages_influencer_达人中心")}</h1>
        <Button variant="ghost" size="icon" className="-mr-2">
          <Settings size={24} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="p-4">
          <div className="bg-gradient-to-br from-primary to-[#1a3039] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            
            <div className="relative z-10">
              <p className="text-sm text-white/80 mb-1">{t("pages_influencer_累计收益")}</p>
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-4xl font-bold">{formatCurrency(influencerData.balance.toFixed(2))}</h2>
                <Button 
                  size="sm" 
                  className="bg-white text-primary hover:bg-white/90 font-bold rounded-lg px-4"
                  onClick={handleWithdraw}
                >
                  {t("pages_influencer_立即提现")}
                </Button>
              </div>
              <p className="text-xs text-white/60">{t("pages_influencer_可提现金额")}</p>
            </div>
          </div>
        </div>

        <div className="px-4 grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1">
            <User size={20} className="text-primary" />
            <span className="text-[10px] text-muted-foreground text-center">{t("pages_influencer_总邀请人数")}</span>
            <span className="font-bold">{influencerData.totalReferrals}</span>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1">
            <Calendar size={20} className="text-primary" />
            <span className="text-[10px] text-muted-foreground text-center">{t("pages_influencer_本月新增")}</span>
            <span className="font-bold">{influencerData.monthlyReferrals}</span>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1">
            <Trophy size={20} className="text-primary" />
            <span className="text-[10px] text-muted-foreground text-center">{t("pages_influencer_当前排名")}</span>
            <span className="font-bold">#{influencerData.rank}</span>
          </div>
        </div>

        <div className="px-4 grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow aspect-[4/3]">
            <ClipboardList size={32} className="text-primary" />
            <span className="font-medium text-sm">{t("pages_influencer_任务中心")}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow aspect-[4/3]">
            <FolderOpen size={32} className="text-primary" />
            <span className="font-medium text-sm">{t("pages_influencer_素材库")}</span>
          </div>
          <Link href="/influencer/leaderboard" className="contents">
            <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow aspect-[4/3]">
              <Trophy size={32} className="text-primary" />
              <span className="font-medium text-sm">{t("pages_influencer_排行榜")}</span>
            </div>
          </Link>
          <Link href="/influencer/cases" className="contents">
            <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow aspect-[4/3]">
              <Lightbulb size={32} className="text-primary" />
              <span className="font-medium text-sm">{t("pages_influencer_优秀案例")}</span>
            </div>
          </Link>
        </div>

        <div className="px-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{t("pages_influencer_最近动态")}</h3>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent">
              {t("pages_influencer_查看全部")} <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {influencerData.activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className={`p-4 flex items-center gap-4 ${index !== influencerData.activities.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 ${colorClass.replace('text-', 'bg-').replace('500', '100')}`}>
                    <Icon size={18} className={colorClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <span className={`font-bold text-sm ${formatCurrency(activity.amount.startsWith('+') ? 'text-primary' : 'text-gray-900')}`}>
                    {activity.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
