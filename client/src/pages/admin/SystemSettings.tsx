/**
 * CHUTEA 智慧中台 - 系统设置页面
 * 
 * 功能：
 * 1. 提现参数配置
 * 2. Telegram 通知开关
 * 3. SMS.ru 状态显示
 * 4. 腾讯云 Captcha 消耗统计
 * 5. 俄语/中文双语切换
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  CreditCard, 
  MessageSquare, 
  Shield, 
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  Save,
  Globe,
  Users,
  FileText,
  DollarSign
} from 'lucide-react';

// ==================== 类型定义 ====================

interface SystemConfig {
  key: string;
  value: any;
  type: string;
  description?: { ru: string; zh: string };
  isDefault?: boolean;
}

interface SmsRuStatus {
  connected: boolean;
  balance: number;
  currency: string;
  senderStatus: string;
  senderName: string | null;
  lastChecked: string;
}

interface CaptchaStatus {
  appId: string;
  todayUsage: number;
  monthUsage: number;
  monthLimit: number;
  status: string;
  lastChecked: string;
}

// ==================== 语言配置 ====================

type Language = 'ru' | 'zh';

const translations = {
  ru: {
    title: 'Настройки системы',
    subtitle: 'Управление параметрами платформы',
    back: 'Назад',
    save: 'Сохранить',
    saving: 'Сохранение...',
    saved: 'Сохранено',
    refresh: 'Обновить',
    // 菜单
    menu: {
      dashboard: 'Панель управления',
      influencers: 'Инфлюенсеры',
      withdrawals: 'Вывод средств',
      smsLogs: 'SMS логи',
      settings: 'Настройки',
    },
    // 提现配置
    withdrawConfig: {
      title: 'Параметры вывода',
      minAmount: 'Минимальная сумма',
      maxAmount: 'Максимальная сумма',
      feePercent: 'Комиссия',
      processingDays: 'Срок обработки',
      days: 'дней',
    },
    // 通知配置
    notifyConfig: {
      title: 'Уведомления Telegram',
      newRegistration: 'Новая регистрация',
      withdrawRequest: 'Заявка на вывод',
      newOrder: 'Новый заказ',
      pointsChange: 'Изменение баллов',
    },
    // SMS 状态
    smsStatus: {
      title: 'Статус SMS.ru',
      balance: 'Баланс',
      sender: 'Отправитель',
      status: 'Статус',
      approved: 'Одобрено',
      pending: 'На проверке',
      rejected: 'Отклонено',
      notConfigured: 'Не настроено',
    },
    // Captcha 状态
    captchaStatus: {
      title: 'Статус Captcha',
      todayUsage: 'Сегодня',
      monthUsage: 'За месяц',
      limit: 'Лимит',
    },
    // 语言
    language: 'Язык',
    russian: 'Русский',
    chinese: '中文',
  },
  zh: {
    title: '系统设置',
    subtitle: '管理平台参数',
    back: '返回',
    save: '保存',
    saving: '保存中...',
    saved: '已保存',
    refresh: '刷新',
    // 菜单
    menu: {
      dashboard: '控制面板',
      influencers: '达人管理',
      withdrawals: '提现审批',
      smsLogs: '短信日志',
      settings: '系统设置',
    },
    // 提现配置
    withdrawConfig: {
      title: '提现参数',
      minAmount: '最低金额',
      maxAmount: '最高金额',
      feePercent: '手续费',
      processingDays: '处理时间',
      days: '天',
    },
    // 通知配置
    notifyConfig: {
      title: 'Telegram 通知',
      newRegistration: '新用户注册',
      withdrawRequest: '提现申请',
      newOrder: '新订单',
      pointsChange: '积分变动',
    },
    // SMS 状态
    smsStatus: {
      title: 'SMS.ru 状态',
      balance: '余额',
      sender: '发送者',
      status: '状态',
      approved: '已通过',
      pending: '审核中',
      rejected: '已拒绝',
      notConfigured: '未配置',
    },
    // Captcha 状态
    captchaStatus: {
      title: '验证码状态',
      todayUsage: '今日使用',
      monthUsage: '本月使用',
      limit: '限额',
    },
    // 语言
    language: '语言',
    russian: '俄语',
    chinese: '中文',
  },
};

// ==================== 主组件 ====================

export default function SystemSettings() {
  // 语言状态
  const [lang, setLang] = useState<Language>('ru');
  const t = translations[lang];
  
  // 配置状态
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // 服务状态
  const [smsStatus, setSmsStatus] = useState<SmsRuStatus | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // 本地配置值
  const [localConfigs, setLocalConfigs] = useState<Record<string, any>>({});
  
  // 加载配置
  useEffect(() => {
    loadConfigs();
    loadStatus();
  }, []);
  
  const loadConfigs = async () => {
    try {
      const res = await fetch('/api/system-settings');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data.configs);
        // 初始化本地配置
        const local: Record<string, any> = {};
        for (const config of data.data.configs) {
          local[config.key] = config.value;
        }
        setLocalConfigs(local);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadStatus = async () => {
    setRefreshing(true);
    try {
      // 加载 SMS.ru 状态
      const smsRes = await fetch('/api/system-settings/status/smsru');
      const smsData = await smsRes.json();
      if (smsData.success) {
        setSmsStatus(smsData.data);
      }
      
      // 加载 Captcha 状态
      const captchaRes = await fetch('/api/system-settings/status/captcha');
      const captchaData = await captchaRes.json();
      if (captchaData.success) {
        setCaptchaStatus(captchaData.data);
      }
    } catch (error) {
      console.error('加载状态失败:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleConfigChange = (key: string, value: any) => {
    setLocalConfigs(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const configsToSave = Object.entries(localConfigs).map(([key, value]) => ({
        key,
        value,
      }));
      
      const res = await fetch('/api/system-settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave }),
      });
      
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const getSenderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500 text-white">{t.smsStatus.approved}</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500 text-white">{t.smsStatus.pending}</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500 text-white">{t.smsStatus.rejected}</Badge>;
      default:
        return <Badge variant="outline">{t.smsStatus.notConfigured}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🧋</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">CHUTEA</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <Settings className="w-5 h-5" />
              <span>{t.menu.dashboard}</span>
            </a>
            <a href="/admin/influencers" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <Users className="w-5 h-5" />
              <span>{t.menu.influencers}</span>
            </a>
            <a href="/admin/withdrawals" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <DollarSign className="w-5 h-5" />
              <span>{t.menu.withdrawals}</span>
            </a>
            <a href="/admin/sms-logs" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <FileText className="w-5 h-5" />
              <span>{t.menu.smsLogs}</span>
            </a>
            <a href="/admin/settings" className="flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl font-medium">
              <Settings className="w-5 h-5" />
              <span>{t.menu.settings}</span>
            </a>
          </nav>
        </div>
      </aside>
      
      {/* 主内容区 */}
      <main className="flex-1 p-8">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500 mt-1">{t.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 语言切换 */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-gray-200">
              <Globe className="w-4 h-4 text-gray-500" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent border-none outline-none text-sm font-medium"
              >
                <option value="ru">🇷🇺 Русский</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>
            
            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all ${
                saved 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t.saving}
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  {t.saved}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.save}
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 提现参数配置 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t.withdrawConfig.title}</h2>
            </div>
            
            <div className="space-y-4">
              {/* 最低提现金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.withdrawConfig.minAmount}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localConfigs.withdraw_min_amount || 1000}
                    onChange={(e) => handleConfigChange('withdraw_min_amount', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>
              
              {/* 最高提现金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.withdrawConfig.maxAmount}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localConfigs.withdraw_max_amount || 100000}
                    onChange={(e) => handleConfigChange('withdraw_max_amount', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>
              
              {/* 手续费 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.withdrawConfig.feePercent}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localConfigs.withdraw_fee_percent || 0}
                    onChange={(e) => handleConfigChange('withdraw_fee_percent', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              
              {/* 处理时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.withdrawConfig.processingDays}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localConfigs.withdraw_processing_days || 3}
                    onChange={(e) => handleConfigChange('withdraw_processing_days', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                    min="1"
                    max="30"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{t.withdrawConfig.days}</span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Telegram 通知开关 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t.notifyConfig.title}</h2>
            </div>
            
            <div className="space-y-4">
              {/* 新用户注册通知 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t.notifyConfig.newRegistration}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfigs.tg_notify_new_registration !== false}
                    onChange={(e) => handleConfigChange('tg_notify_new_registration', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              {/* 提现申请通知 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t.notifyConfig.withdrawRequest}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfigs.tg_notify_withdraw_request !== false}
                    onChange={(e) => handleConfigChange('tg_notify_withdraw_request', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              {/* 新订单通知 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t.notifyConfig.newOrder}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfigs.tg_notify_new_order !== false}
                    onChange={(e) => handleConfigChange('tg_notify_new_order', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              {/* 积分变动通知 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600">⭐</span>
                  </div>
                  <span className="font-medium text-gray-800">{t.notifyConfig.pointsChange}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfigs.tg_notify_points_change !== false}
                    onChange={(e) => handleConfigChange('tg_notify_points_change', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </Card>
          
          {/* SMS.ru 状态 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t.smsStatus.title}</h2>
              </div>
              <button
                onClick={loadStatus}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {smsStatus ? (
              <div className="space-y-4">
                {/* 连接状态 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">{t.smsStatus.status}</span>
                  {smsStatus.connected ? (
                    <Badge className="bg-green-500 text-white">✓ Online</Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white">✗ Offline</Badge>
                  )}
                </div>
                
                {/* 余额 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">{t.smsStatus.balance}</span>
                  <span className="text-2xl font-bold text-green-600">
                    {smsStatus.balance?.toFixed(2)} {smsStatus.currency}
                  </span>
                </div>
                
                {/* 发送者状态 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">{t.smsStatus.sender}</span>
                  <div className="flex items-center gap-2">
                    {smsStatus.senderName && (
                      <span className="font-medium">{smsStatus.senderName}</span>
                    )}
                    {getSenderStatusBadge(smsStatus.senderStatus)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Загрузка данных...</p>
              </div>
            )}
          </Card>
          
          {/* Captcha 状态 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t.captchaStatus.title}</h2>
              </div>
              <Badge className="bg-green-500 text-white">Active</Badge>
            </div>
            
            {captchaStatus ? (
              <div className="space-y-4">
                {/* 今日使用 */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">{t.captchaStatus.todayUsage}</span>
                    <span className="text-xl font-bold text-gray-900">{captchaStatus.todayUsage}</span>
                  </div>
                </div>
                
                {/* 本月使用 */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">{t.captchaStatus.monthUsage}</span>
                    <span className="text-xl font-bold text-gray-900">
                      {captchaStatus.monthUsage} / {captchaStatus.monthLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(captchaStatus.monthUsage / captchaStatus.monthLimit) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {((captchaStatus.monthUsage / captchaStatus.monthLimit) * 100).toFixed(1)}% {t.captchaStatus.limit}
                  </p>
                </div>
                
                {/* App ID */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">App ID</span>
                  <code className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">
                    {captchaStatus.appId}
                  </code>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Загрузка данных...</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
