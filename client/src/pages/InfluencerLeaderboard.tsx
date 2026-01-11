import { useState } from "react";
import { ChevronLeft, Trophy, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/i18n";

// 模拟排行榜数据
const MOCK_LEADERBOARD = [
  { rank: 1, name: "Anna K.", avatar: "👩", referrals: 245, earnings: 12250, trend: "up" },
  { rank: 2, name: "Dmitry V.", avatar: "👨", referrals: 198, earnings: 9900, trend: "up" },
  { rank: 3, name: "Elena S.", avatar: "👩‍🦰", referrals: 176, earnings: 8800, trend: "down" },
  { rank: 4, name: "Ivan P.", avatar: "👨‍💼", referrals: 152, earnings: 7600, trend: "up" },
  { rank: 5, name: "Maria L.", avatar: "👩‍💻", referrals: 143, earnings: 7150, trend: "same" },
  { rank: 6, name: "Alexey N.", avatar: "👨‍🎓", referrals: 128, earnings: 6400, trend: "up" },
  { rank: 7, name: "Olga M.", avatar: "👩‍🔬", referrals: 115, earnings: 5750, trend: "down" },
  { rank: 8, name: "Sergey K.", avatar: "👨‍🏫", referrals: 102, earnings: 5100, trend: "up" },
  { rank: 9, name: "Natalia R.", avatar: "👩‍🎨", referrals: 95, earnings: 4750, trend: "same" },
  { rank: 10, name: "Pavel D.", avatar: "👨‍🚀", referrals: 87, earnings: 4350, trend: "up" },
  { rank: 11, name: "Tatiana B.", avatar: "👩‍⚕️", referrals: 78, earnings: 3900, trend: "down" },
  { rank: 12, name: "Viktor G.", avatar: "👨‍🔧", referrals: 72, earnings: 3600, trend: "up" },
  { rank: 13, name: "Yulia F.", avatar: "👩‍🍳", referrals: 65, earnings: 3250, trend: "same" },
  { rank: 14, name: "Andrey T.", avatar: "👨‍✈️", referrals: 58, earnings: 2900, trend: "up" },
  { rank: 15, name: "Svetlana Z.", avatar: "👩‍🎤", referrals: 52, earnings: 2600, trend: "down" },
];

export default function InfluencerLeaderboard() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  
  const periodLabels = {
    week: "Эта неделя",
    month: "Этот месяц",
    all: "Всего"
  };
  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: "🥇", color: "bg-gradient-to-br from-yellow-400 to-yellow-600", text: "text-white" };
    if (rank === 2) return { icon: "🥈", color: "bg-gradient-to-br from-gray-300 to-gray-500", text: "text-white" };
    if (rank === 3) return { icon: "🥉", color: "bg-gradient-to-br from-orange-400 to-orange-600", text: "text-white" };
    return { icon: rank.toString(), color: "bg-gray-100", text: "text-gray-600" };
  };
  
  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp size={14} className="text-green-500" />;
    if (trend === "down") return <TrendingUp size={14} className="text-red-500 rotate-180" />;
    return <span className="text-gray-400 text-xs">-</span>;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto shadow-2xl relative flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
        <Link href="/influencer">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ChevronLeft size={24} />
          </Button>
        </Link>
        <h1 className="font-bold text-lg">达人排行榜</h1>
        <div className="w-10" />
      </header>
      
      {/* Period Tabs */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>
      
      {/* Top 3 Podium */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-8">
        <div className="flex items-end justify-center gap-4">
          {/* Rank 2 */}
          <div className="flex flex-col items-center flex-1">
            <div className="text-4xl mb-2">{MOCK_LEADERBOARD[1].avatar}</div>
            <div className="text-white/90 text-xs mb-1">{MOCK_LEADERBOARD[1].name}</div>
            <div className="text-white font-bold text-sm mb-2">{formatCurrency(MOCK_LEADERBOARD[1].earnings)}</div>
            <div className="w-full bg-white/20 backdrop-blur-sm rounded-t-lg p-3 flex flex-col items-center">
              <span className="text-3xl mb-1">🥈</span>
              <span className="text-white font-bold">2nd</span>
            </div>
          </div>
          
          {/* Rank 1 */}
          <div className="flex flex-col items-center flex-1 -mt-4">
            <div className="text-5xl mb-2">{MOCK_LEADERBOARD[0].avatar}</div>
            <div className="text-white text-sm mb-1 font-medium">{MOCK_LEADERBOARD[0].name}</div>
            <div className="text-white font-bold mb-2">{formatCurrency(MOCK_LEADERBOARD[0].earnings)}</div>
            <div className="w-full bg-white/30 backdrop-blur-sm rounded-t-lg p-4 flex flex-col items-center">
              <span className="text-4xl mb-1">🥇</span>
              <span className="text-white font-bold text-lg">1st</span>
            </div>
          </div>
          
          {/* Rank 3 */}
          <div className="flex flex-col items-center flex-1">
            <div className="text-4xl mb-2">{MOCK_LEADERBOARD[2].avatar}</div>
            <div className="text-white/90 text-xs mb-1">{MOCK_LEADERBOARD[2].name}</div>
            <div className="text-white font-bold text-sm mb-2">{formatCurrency(MOCK_LEADERBOARD[2].earnings)}</div>
            <div className="w-full bg-white/15 backdrop-blur-sm rounded-t-lg p-3 flex flex-col items-center">
              <span className="text-3xl mb-1">🥉</span>
              <span className="text-white font-bold">3rd</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {MOCK_LEADERBOARD.slice(3).map((user, index) => {
            const badge = getRankBadge(user.rank);
            return (
              <div
                key={user.rank}
                className={`p-4 flex items-center gap-4 ${
                  index !== MOCK_LEADERBOARD.slice(3).length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {/* Rank Badge */}
                <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center font-bold ${badge.text} flex-shrink-0`}>
                  {badge.icon}
                </div>
                
                {/* Avatar */}
                <div className="text-3xl">{user.avatar}</div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{user.name}</h4>
                    {getTrendIcon(user.trend)}
                  </div>
                  <p className="text-xs text-gray-500">{user.referrals} 人邀请</p>
                </div>
                
                {/* Earnings */}
                <div className="text-right">
                  <div className="font-bold text-teal-600">{formatCurrency(user.earnings)}</div>
                  <div className="text-xs text-gray-400">收益</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* My Rank Card */}
        <div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border-2 border-teal-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                23
              </div>
              <div>
                <div className="font-bold text-sm mb-1">我的排名</div>
                <div className="text-xs text-gray-600">继续加油，冲进前20！</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-teal-600">{formatCurrency(1)},240</div>
              <div className="text-xs text-gray-500">累计收益</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
