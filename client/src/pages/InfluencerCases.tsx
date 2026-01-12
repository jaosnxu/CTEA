import { useState } from "react";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/i18n";

// 模拟成功案例数据
const MOCK_CASES = [
  {
    id: 1,
    user: {
      name: "Anna K.",
      avatar: "👩",
      title: "Золотой инфлюенсер",
      badge: "🏆",
    },
    achievement: {
      referrals: 245,
      earnings: 12250,
      period: "3 месяца",
    },
    story:
      "Делясь качественными продуктами и опытом обслуживания CHUTEA в социальных сетях, я успешно пригласил 245 друзей. Главное - искренне делиться, чтобы друзья почувствовали ценность бренда.",
    tips: [
      "Выберите подходящую социальную платформу",
      "Делитесь реальным опытом использования",
      "Регулярно публикуйте качественный контент",
      "Активно взаимодействуйте с подписчиками",
    ],
    image: "/images/cases/case_01.jpg",
    likes: 1240,
    comments: 89,
    shares: 156,
  },
  {
    id: 2,
    user: {
      name: "Dmitry V.",
      avatar: "👨",
      title: "Серебряный инфлюенсер",
      badge: "🥈",
    },
    achievement: {
      referrals: 198,
      earnings: 9900,
      period: "2 месяца",
    },
    story:
      "Мой секрет - создание собственного сообщества любителей чая, регулярная организация офлайн-дегустаций. Личное общение даёт высокую конверсию.",
    tips: [
      "Создайте эксклюзивное сообщество",
      "Организуйте офлайн-мероприятия",
      "Давайте профессиональные советы",
      "Создайте личный бренд",
    ],
    image: "/images/cases/case_02.jpg",
    likes: 980,
    comments: 67,
    shares: 124,
  },
  {
    id: 3,
    user: {
      name: "Elena S.",
      avatar: "👩‍🦰",
      title: "Бронзовый инфлюенсер",
      badge: "🥉",
    },
    achievement: {
      referrals: 176,
      earnings: 8800,
      period: "4 месяца",
    },
    story:
      "Как фуд-блогер, я интегрирую CHUTEA в повседневный контент. Красивые фото и видео привлекают много подписчиков.",
    tips: [
      "Создавайте качественный контент",
      "Поддерживайте частоту публикаций",
      "Используйте визуальный маркетинг",
      "Завоёвывайте доверие подписчиков",
    ],
    image: "/images/cases/case_03.jpg",
    likes: 856,
    comments: 54,
    shares: 98,
  },
  {
    id: 4,
    user: {
      name: "Ivan P.",
      avatar: "👨‍💼",
      title: "Отличный инфлюенсер",
      badge: "⭐",
    },
    achievement: {
      referrals: 152,
      earnings: 7600,
      period: "3 месяца",
    },
    story:
      "Я фокусируюсь на корпоративных клиентах, предоставляя услуги CHUTEA для тимбилдингов и конференций. B2B модель делает продвижение эффективнее.",
    tips: [
      "Развивайте корпоративных клиентов",
      "Предлагайте индивидуальные услуги",
      "Стройте долгосрочное сотрудничество",
      "Сарафанное радио",
    ],
    image: "/images/cases/case_04.jpg",
    likes: 724,
    comments: 42,
    shares: 87,
  },
  {
    id: 5,
    user: {
      name: "Maria L.",
      avatar: "👩‍💻",
      title: "Отличный инфлюенсер",
      badge: "⭐",
    },
    achievement: {
      referrals: 143,
      earnings: 7150,
      period: "2 месяца",
    },
    story:
      "Используя трафик коротких видео, я создал серию обзоров и креативных рецептов CHUTEA, быстро набрав подписчиков.",
    tips: [
      "Используйте преимущества платформы",
      "Создавайте креативный контент",
      "Оптимизируйте через аналитику",
      "Постоянно учитесь и развивайтесь",
    ],
    image: "/images/cases/case_05.jpg",
    likes: 692,
    comments: 38,
    shares: 76,
  },
];

export default function InfluencerCases() {
  const { t } = useLanguage();
  const [likedCases, setLikedCases] = useState<number[]>([]);

  const toggleLike = (caseId: number) => {
    setLikedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
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
        <h1 className="font-bold text-lg">优秀案例</h1>
        <div className="w-10" />
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-6 text-white">
        <h2 className="text-2xl font-bold mb-2">向Отличный инфлюенсер学习</h2>
        <p className="text-sm text-white/80">他们的成功经验，值得你借鉴</p>
      </div>

      {/* Cases List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {MOCK_CASES.map(caseItem => (
          <div
            key={caseItem.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            {/* User Header */}
            <div className="p-4 flex items-center gap-3">
              <div className="text-4xl">{caseItem.user.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm">{caseItem.user.name}</h3>
                  <span className="text-lg">{caseItem.user.badge}</span>
                </div>
                <p className="text-xs text-gray-500">{caseItem.user.title}</p>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="px-4 pb-4">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-3 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-600">
                    {caseItem.achievement.referrals}
                  </div>
                  <div className="text-xs text-gray-600">邀请человек数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-600">
                    {formatCurrency(caseItem.achievement.earnings)}
                  </div>
                  <div className="text-xs text-gray-600">累计收益</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-600">
                    {caseItem.achievement.period}
                  </div>
                  <div className="text-xs text-gray-600">达成时间</div>
                </div>
              </div>
            </div>

            {/* Story */}
            <div className="px-4 pb-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <TrendingUp size={16} className="text-teal-600" />
                成功经验
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {caseItem.story}
              </p>

              {/* Tips */}
              <h4 className="font-semibold text-sm mb-2">实用技巧</h4>
              <div className="space-y-1.5">
                {caseItem.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-teal-600 text-xs mt-0.5">✓</span>
                    <span className="text-xs text-gray-600 flex-1">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interaction Bar */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => toggleLike(caseItem.id)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Heart
                  size={18}
                  className={
                    likedCases.includes(caseItem.id)
                      ? "fill-red-500 text-red-500"
                      : ""
                  }
                />
                <span className="text-sm">
                  {caseItem.likes + (likedCases.includes(caseItem.id) ? 1 : 0)}
                </span>
              </button>

              <button className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 transition-colors">
                <MessageCircle size={18} />
                <span className="text-sm">{caseItem.comments}</span>
              </button>

              <button className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 transition-colors">
                <Share2 size={18} />
                <span className="text-sm">{caseItem.shares}</span>
              </button>
            </div>
          </div>
        ))}

        {/* CTA Card */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">
            你也可以成为Отличный инфлюенсер
          </h3>
          <p className="text-sm text-white/80 mb-4">
            开始你的推广之旅，分享收益，成就梦想
          </p>
          <Link href="/referral">
            <Button className="bg-white text-teal-600 hover:bg-white/90 font-bold w-full">
              立即开始推广
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
