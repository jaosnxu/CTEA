/**
 * CHUTEA 智慧中台 - SDUI 配置中心
 * 
 * 功能：
 * 1. 会员等级权益配置（4级阶梯）
 * 2. 主题颜色配置（实时预览）
 * 3. Banner 配置
 * 4. 功能开关
 */

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

// ==================== 类型定义 ====================

interface MembershipTier {
  level: number;
  name: { ru: string; zh: string };
  minSpend: number;
  benefits: {
    pointsMultiplier: number;
    discountPercent: number;
    freeDelivery: boolean;
    prioritySupport: boolean;
    birthdayBonus: number;
    exclusiveProducts: boolean;
    earlyAccess: boolean;
  };
  icon: string;
  color: string;
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerStyle: 'light' | 'dark' | 'gradient';
  buttonStyle: 'rounded' | 'square' | 'pill';
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: 'Центр конфигурации SDUI',
    subtitle: 'Управление интерфейсом приложения в реальном времени',
    tabs: {
      membership: 'Уровни членства',
      theme: 'Тема',
      banners: 'Баннеры',
      features: 'Функции',
    },
    membership: {
      title: 'Настройка уровней членства',
      level: 'Уровень',
      minSpend: 'Мин. расходы (₽)',
      pointsMultiplier: 'Множитель баллов',
      discount: 'Скидка (%)',
      freeDelivery: 'Бесплатная доставка',
      prioritySupport: 'Приоритетная поддержка',
      birthdayBonus: 'Бонус на день рождения',
      exclusiveProducts: 'Эксклюзивные товары',
      earlyAccess: 'Ранний доступ',
    },
    theme: {
      title: 'Настройка темы',
      primaryColor: 'Основной цвет',
      secondaryColor: 'Вторичный цвет',
      accentColor: 'Акцентный цвет',
      backgroundColor: 'Цвет фона',
      textColor: 'Цвет текста',
      headerStyle: 'Стиль заголовка',
      buttonStyle: 'Стиль кнопок',
      preview: 'Предпросмотр',
    },
    actions: {
      save: 'Сохранить',
      reset: 'Сбросить',
      saving: 'Сохранение...',
    },
    success: 'Настройки сохранены',
    error: 'Ошибка сохранения',
  },
  zh: {
    title: 'SDUI 配置中心',
    subtitle: '实时管理应用界面',
    tabs: {
      membership: '会员等级',
      theme: '主题',
      banners: 'Banner',
      features: '功能开关',
    },
    membership: {
      title: '会员等级配置',
      level: '等级',
      minSpend: '最低消费 (₽)',
      pointsMultiplier: '积分倍率',
      discount: '折扣 (%)',
      freeDelivery: '免费配送',
      prioritySupport: '优先客服',
      birthdayBonus: '生日奖励',
      exclusiveProducts: '专属商品',
      earlyAccess: '提前购买',
    },
    theme: {
      title: '主题配置',
      primaryColor: '主色',
      secondaryColor: '辅色',
      accentColor: '强调色',
      backgroundColor: '背景色',
      textColor: '文字色',
      headerStyle: '头部样式',
      buttonStyle: '按钮样式',
      preview: '预览',
    },
    actions: {
      save: '保存',
      reset: '重置',
      saving: '保存中...',
    },
    success: '设置已保存',
    error: '保存失败',
  },
};

// ==================== 默认配置 ====================

const defaultMembershipTiers: MembershipTier[] = [
  {
    level: 1,
    name: { ru: 'Бронза', zh: '青铜' },
    minSpend: 0,
    benefits: {
      pointsMultiplier: 1,
      discountPercent: 0,
      freeDelivery: false,
      prioritySupport: false,
      birthdayBonus: 100,
      exclusiveProducts: false,
      earlyAccess: false,
    },
    icon: '🥉',
    color: '#CD7F32',
  },
  {
    level: 2,
    name: { ru: 'Серебро', zh: '白银' },
    minSpend: 2000,
    benefits: {
      pointsMultiplier: 1.5,
      discountPercent: 5,
      freeDelivery: false,
      prioritySupport: false,
      birthdayBonus: 200,
      exclusiveProducts: false,
      earlyAccess: false,
    },
    icon: '🥈',
    color: '#C0C0C0',
  },
  {
    level: 3,
    name: { ru: 'Золото', zh: '黄金' },
    minSpend: 8000,
    benefits: {
      pointsMultiplier: 2,
      discountPercent: 10,
      freeDelivery: true,
      prioritySupport: true,
      birthdayBonus: 500,
      exclusiveProducts: true,
      earlyAccess: false,
    },
    icon: '🥇',
    color: '#FFD700',
  },
  {
    level: 4,
    name: { ru: 'Платина', zh: '铂金' },
    minSpend: 20000,
    benefits: {
      pointsMultiplier: 3,
      discountPercent: 15,
      freeDelivery: true,
      prioritySupport: true,
      birthdayBonus: 1000,
      exclusiveProducts: true,
      earlyAccess: true,
    },
    icon: '💎',
    color: '#E5E4E2',
  },
];

const defaultTheme: ThemeConfig = {
  primaryColor: '#F97316',
  secondaryColor: '#10B981',
  accentColor: '#8B5CF6',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  headerStyle: 'light',
  buttonStyle: 'rounded',
};

// ==================== 主页面组件 ====================

export default function SDUIConfigPage() {
  const [lang, setLang] = useState<'ru' | 'zh'>('ru');
  const [activeTab, setActiveTab] = useState<'membership' | 'theme' | 'banners' | 'features'>('membership');
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>(defaultMembershipTiers);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const t = translations[lang];

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/sdui/config');
      const data = await response.json();
      if (data.success) {
        setMembershipTiers(data.data.membershipTiers || defaultMembershipTiers);
        setTheme(data.data.theme || defaultTheme);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  // 保存会员等级
  const saveMembershipTiers = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sdui/membership-tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: membershipTiers }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: t.success });
      } else {
        setMessage({ type: 'error', text: data.error?.message || t.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 保存主题
  const saveTheme = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sdui/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: t.success });
      } else {
        setMessage({ type: 'error', text: data.error?.message || t.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 更新会员等级
  const updateTier = (index: number, field: string, value: any) => {
    const newTiers = [...membershipTiers];
    if (field.startsWith('benefits.')) {
      const benefitField = field.replace('benefits.', '');
      (newTiers[index].benefits as any)[benefitField] = value;
    } else {
      (newTiers[index] as any)[field] = value;
    }
    setMembershipTiers(newTiers);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎨 {t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === 'ru' ? 'zh' : 'ru')}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              {lang === 'ru' ? '中文' : 'Русский'}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b">
          {(['membership', 'theme', 'banners', 'features'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* 会员等级配置 */}
        {activeTab === 'membership' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">{t.membership.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {membershipTiers.map((tier, index) => (
                <div
                  key={tier.level}
                  className="bg-white rounded-xl p-4 shadow-sm border"
                  style={{ borderColor: tier.color }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{tier.icon}</span>
                    <span className="font-bold" style={{ color: tier.color }}>
                      {tier.name[lang]}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">{t.membership.minSpend}</label>
                      <input
                        type="number"
                        value={tier.minSpend}
                        onChange={(e) => updateTier(index, 'minSpend', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                        min={0}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500">{t.membership.pointsMultiplier}</label>
                      <input
                        type="number"
                        value={tier.benefits.pointsMultiplier}
                        onChange={(e) => updateTier(index, 'benefits.pointsMultiplier', parseFloat(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                        step={0.5}
                        min={1}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500">{t.membership.discount}</label>
                      <input
                        type="number"
                        value={tier.benefits.discountPercent}
                        onChange={(e) => updateTier(index, 'benefits.discountPercent', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                        min={0}
                        max={50}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500">{t.membership.birthdayBonus}</label>
                      <input
                        type="number"
                        value={tier.benefits.birthdayBonus}
                        onChange={(e) => updateTier(index, 'benefits.birthdayBonus', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                        min={0}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tier.benefits.freeDelivery}
                          onChange={(e) => updateTier(index, 'benefits.freeDelivery', e.target.checked)}
                          className="rounded"
                        />
                        {t.membership.freeDelivery}
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tier.benefits.prioritySupport}
                          onChange={(e) => updateTier(index, 'benefits.prioritySupport', e.target.checked)}
                          className="rounded"
                        />
                        {t.membership.prioritySupport}
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tier.benefits.exclusiveProducts}
                          onChange={(e) => updateTier(index, 'benefits.exclusiveProducts', e.target.checked)}
                          className="rounded"
                        />
                        {t.membership.exclusiveProducts}
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tier.benefits.earlyAccess}
                          onChange={(e) => updateTier(index, 'benefits.earlyAccess', e.target.checked)}
                          className="rounded"
                        />
                        {t.membership.earlyAccess}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={saveMembershipTiers}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? t.actions.saving : t.actions.save}
              </button>
              <button
                onClick={() => setMembershipTiers(defaultMembershipTiers)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t.actions.reset}
              </button>
            </div>
          </div>
        )}

        {/* 主题配置 */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">{t.theme.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 颜色配置 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4">
                <div>
                  <label className="text-sm text-gray-600">{t.theme.primaryColor}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="flex-1 p-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">{t.theme.secondaryColor}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="flex-1 p-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">{t.theme.accentColor}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="flex-1 p-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">{t.theme.backgroundColor}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="flex-1 p-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
              
              {/* 预览 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="text-sm text-gray-600 mb-3">{t.theme.preview}</h3>
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ backgroundColor: theme.backgroundColor }}
                >
                  <div
                    className="p-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {lang === 'ru' ? 'Основная кнопка' : '主按钮'}
                  </div>
                  <div
                    className="p-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    {lang === 'ru' ? 'Вторичная кнопка' : '次按钮'}
                  </div>
                  <div
                    className="p-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    {lang === 'ru' ? 'Акцентная кнопка' : '强调按钮'}
                  </div>
                  <p style={{ color: theme.textColor }}>
                    {lang === 'ru' ? 'Пример текста' : '示例文字'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={saveTheme}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? t.actions.saving : t.actions.save}
              </button>
              <button
                onClick={() => setTheme(defaultTheme)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t.actions.reset}
              </button>
            </div>
          </div>
        )}

        {/* Banner 配置 */}
        {activeTab === 'banners' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-gray-500">
              {lang === 'ru' ? 'Функция в разработке...' : '功能开发中...'}
            </p>
          </div>
        )}

        {/* 功能开关 */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-gray-500">
              {lang === 'ru' ? 'Функция в разработке...' : '功能开发中...'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
