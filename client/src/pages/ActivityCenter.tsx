import { useState } from "react";
import { ArrowLeft, Gift, Trophy, Users, Calendar, Star, Heart, MessageCircle, UserPlus, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

interface LotteryActivity {
  id: string;
  title: string;
  period: string;
  prize: string;
  prizeImage: string;
  startDate: string;
  endDate: string;
  status: "ongoing" | "ended";
  participants: number;
}

interface Winner {
  id: string;
  activityId: string;
  userName: string;
  avatar: string;
  prize: string;
  date: string;
  comment?: string;
  images?: string[];
  likes: number;
}

interface MarketingActivity {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  path?: string;
  action?: () => void;
}

export default function ActivityCenter() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("marketing");

  const MARKETING_ACTIVITIES: MarketingActivity[] = [
    {
      id: "referral",
      title: t("pages_activity_邀请好友"),
      description: t("pages_activity_邀请好友注册双方各得优惠券"),
      icon: "UserPlus",
      badge: t("pages_activity_得优惠券"),
      path: "/referral",
    },
    {
      id: "flash-sale",
      title: t("pages_activity_限时秒杀"),
      description: t("pages_activity_每日10点开抢低至5折"),
      icon: "Zap",
      badge: t("pages_activity_进行中"),
      path: "/flash-sale",
    },
    {
      id: "daily-checkin",
      title: t("pages_activity_每日签到"),
      description: t("pages_activity_签到领积分连续签到奖励翻倍"),
      icon: "Calendar",
      badge: t("pages_activity_每日更新"),
    },
  ];

  const ACTIVITIES: LotteryActivity[] = [
    {
      id: "1",
      title: t("pages_activity_一月限定抽奖"),
      period: t("pages_activity_2026年1月"),
      prize: "iPhone 15 Pro Max",
      prizeImage: "https://images.unsplash.com/photo-1695048064867-1c48f9c7d3f1?w=400",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      status: "ongoing",
      participants: 1250
    },
    {
      id: "2",
      title: t("pages_activity_十二月圣诞特惠"),
      period: t("pages_activity_2025年12月"),
      prize: "AirPods Pro 2",
      prizeImage: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400",
      startDate: "2025-12-01",
      endDate: "2025-12-31",
      status: "ended",
      participants: 980
    },
    {
      id: "3",
      title: t("pages_activity_十一月感恩回馈"),
      period: t("pages_activity_2025年11月"),
      prize: "iPad Air",
      prizeImage: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
      startDate: "2025-11-01",
      endDate: "2025-11-30",
      status: "ended",
      participants: 856
    }
  ];

  const WINNERS: Winner[] = [
    {
      id: "1",
      activityId: "2",
      userName: "Александр М.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
      prize: "AirPods Pro 2",
      date: "2025-12-31",
      comment: t("pages_activity_winner_comment_1"),
      images: [
        "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400",
        "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400"
      ],
      likes: 128
    },
    {
      id: "2",
      activityId: "2",
      userName: "Мария К.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
      prize: "AirPods Pro 2",
      date: "2025-12-30",
      comment: t("pages_activity_winner_comment_2"),
      images: ["https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400"],
      likes: 95
    },
    {
      id: "3",
      activityId: "3",
      userName: "Иван П.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
      prize: "iPad Air",
      date: "2025-11-30",
      comment: t("pages_activity_winner_comment_3"),
      images: [
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
        "https://images.unsplash.com/photo-1585790050230-5dd28404f1a1?w=400",
        "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400"
      ],
      likes: 203
    }
  ];
  
  const userStats = {
    participated: 15,
    won: 2,
    totalActivities: ACTIVITIES.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 px-4 py-6 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile">
            <ArrowLeft size={24} className="cursor-pointer" />
          </Link>
          <h1 className="font-bold text-xl">{t("pages_activity_活动中心")}</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold mb-1">{userStats.participated}</div>
            <div className="text-xs opacity-90">{t("pages_activity_参加次数")}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold mb-1">{userStats.won}</div>
            <div className="text-xs opacity-90">{t("pages_activity_中奖次数")}</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold mb-1">{((userStats.won / userStats.participated) * 100).toFixed(0)}%</div>
            <div className="text-xs opacity-90">{t("pages_activity_中奖率")}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="marketing">{t("pages_activity_营销活动")}</TabsTrigger>
          <TabsTrigger value="activities">{t("pages_activity_抽奖活动")}</TabsTrigger>
          <TabsTrigger value="winners">{t("pages_activity_中奖名单")}</TabsTrigger>
        </TabsList>

        {/* Marketing Activities Tab */}
        <TabsContent value="marketing" className="space-y-3">
          {MARKETING_ACTIVITIES.map((activity) => {
            const IconComponent = activity.icon === "UserPlus" ? UserPlus : 
                                 activity.icon === "Zap" ? Zap : Calendar;
            
            return (
              <Link key={activity.id} href={activity.path || "#"}>
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconComponent size={24} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    {activity.badge && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white whitespace-nowrap">
                        {activity.badge}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-3">
          {ACTIVITIES.map((activity) => (
            <div key={activity.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="relative">
                <img 
                  src={activity.prizeImage} 
                  alt={activity.prize} 
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activity.status === "ongoing" 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-500 text-white"
                  }`}>
                    {activity.status === "ongoing" ? t("pages_activity_进行中") : t("pages_activity_已结束")}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{activity.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Calendar size={14} />
                  <span>{activity.period}</span>
                  <span>·</span>
                  <Users size={14} />
                  <span>{activity.participants} {t("pages_activity_人参与")}</span>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-primary" />
                    <span className="text-sm font-bold">{activity.prize}</span>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={activity.status === "ended"}
                    className={activity.status === "ended" ? "opacity-50" : ""}
                  >
                    {activity.status === "ongoing" ? t("pages_activity_立即参与") : t("pages_activity_已结束")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Winners Tab */}
        <TabsContent value="winners" className="space-y-4">
          {WINNERS.map((winner) => (
            <div key={winner.id} className="bg-white rounded-xl p-4 shadow-sm">
              {/* Winner Header */}
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={winner.avatar} 
                  alt={winner.userName} 
                  className="w-12 h-12 rounded-full bg-gray-100"
                />
                <div className="flex-1">
                  <div className="font-bold">{winner.userName}</div>
                  <div className="text-xs text-muted-foreground">{winner.date}</div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                  <Trophy size={12} />
                  <span>{t("pages_activity_中奖")}</span>
                </div>
              </div>

              {/* Prize */}
              <div className="bg-primary/5 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gift size={16} className="text-primary" />
                  <span className="font-bold text-primary">{winner.prize}</span>
                </div>
              </div>

              {/* Comment */}
              {winner.comment && (
                <p className="text-sm text-muted-foreground mb-3">{winner.comment}</p>
              )}

              {/* Images */}
              {winner.images && winner.images.length > 0 && (
                <div className={`grid gap-2 mb-3 ${
                  winner.images.length === 1 ? "grid-cols-1" : 
                  winner.images.length === 2 ? "grid-cols-2" : 
                  "grid-cols-3"
                }`}>
                  {winner.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`${t("pages_activity_晒单")} ${idx + 1}`} 
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-sm text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                  <Heart size={16} />
                  <span>{winner.likes}</span>
                </button>
                <button className="flex items-center gap-1 hover:text-primary transition-colors">
                  <MessageCircle size={16} />
                  <span>{t("pages_activity_评论")}</span>
                </button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
