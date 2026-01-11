/**
 * CHUTEA 智慧中台 - 个人中心页面
 * 
 * 功能：
 * 1. 显示用户信息（手机号）
 * 2. 显示待提现余额
 * 3. 提现按钮（触发 TG 通知）
 * 4. 绑定 Telegram 按钮
 * 5. 退出登录
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '../contexts/AuthContext';

// ==================== 类型定义 ====================

interface WithdrawMethod {
  id: string;
  name: string;
  icon: string;
}

interface WithdrawHistory {
  id: string;
  amount: number;
  method: string;
  methodName: string;
  status: string;
  statusName: string;
  createdAt: string;
}

// ==================== 常量 ====================

const WITHDRAW_METHODS: WithdrawMethod[] = [
  { id: 'SBERBANK', name: 'Сбербанк', icon: '🏦' },
  { id: 'TINKOFF', name: 'Тинькофф', icon: '💳' },
  { id: 'SBP', name: 'СБП', icon: '⚡' },
];

// ==================== 组件 ====================

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, logout, isAuthenticated } = useAuth();
  
  // 解析 URL 参数
  const urlParams = new URLSearchParams(search);
  const shouldShowTelegramBind = urlParams.get('showTelegramBind') === 'true';
  
  // 状态
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showTelegramWelcome, setShowTelegramWelcome] = useState(shouldShowTelegramBind);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('SBERBANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([]);
  
  // 模拟用户数据（实际应从 API 获取）
  const [balance, setBalance] = useState(18500);
  const [telegramBound, setTelegramBound] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  
  // 未登录则跳转
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]);
  
  // 加载提现历史
  useEffect(() => {
    loadWithdrawHistory();
  }, []);
  
  /**
   * 加载提现历史
   */
  const loadWithdrawHistory = async () => {
    try {
      const response = await fetch('/api/withdrawals');
      const data = await response.json();
      if (data.success) {
        setWithdrawHistory(data.data.history || []);
      }
    } catch (error) {
      console.error('加载提现历史失败:', error);
    }
  };
  
  /**
   * 提交提现申请
   */
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    // 验证
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Укажите корректную сумму' });
      return;
    }
    
    if (amount < 100) {
      setMessage({ type: 'error', text: 'Минимальная сумма: 100 ₽' });
      return;
    }
    
    if (amount > balance) {
      setMessage({ type: 'error', text: 'Недостаточно средств' });
      return;
    }
    
    if (!accountNumber.trim()) {
      setMessage({ type: 'error', text: 'Укажите реквизиты' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          method: withdrawMethod,
          accountNumber: accountNumber.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${data.data.message}${data.data.telegramNotified ? ' (TG уведомление отправлено)' : ''}` 
        });
        setBalance(data.data.balanceAfter);
        setWithdrawAmount('');
        setAccountNumber('');
        setShowWithdrawModal(false);
        loadWithdrawHistory();
      } else {
        setMessage({ type: 'error', text: data.error?.messageRu || 'Ошибка' });
      }
    } catch (error) {
      console.error('提现失败:', error);
      setMessage({ type: 'error', text: 'Ошибка сети. Попробуйте позже.' });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 生成 Telegram 绑定链接
   */
  const handleBindTelegram = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/bind/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 打开 Telegram 绑定链接
        window.open(data.data.bindLink, '_blank');
        setShowTelegramModal(true);
      }
    } catch (error) {
      console.error('生成绑定链接失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 登出
   */
  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* 顶部导航 */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b border-amber-100">
        <button onClick={() => setLocation('/')} className="text-gray-600 hover:text-amber-600">
          ← Назад
        </button>
        <h1 className="font-bold text-gray-800">Личный кабинет</h1>
        <div className="w-16"></div>
      </div>
      
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 消息提示 */}
        {message && (
          <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white font-bold">
                {(user.nickname || user.phone)?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.nickname || 'Гость'}</h2>
              <p className="text-gray-500">{user.phone}</p>
              <p className="text-xs text-gray-400">ID: #{user.id}</p>
            </div>
          </div>
        </div>
        
        {/* 余额卡片 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/80 text-sm">Доступно для вывода</p>
              <p className="text-3xl font-bold">{balance.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-xs">Всего выведено</p>
              <p className="font-semibold">45 000 ₽</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full py-3 bg-white text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-all"
          >
            💰 Вывести средства
          </button>
        </div>
        
        {/* Telegram 绑定卡片 */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Telegram</h3>
                {telegramBound ? (
                  <p className="text-sm text-green-600">✓ Подключён: {telegramUsername}</p>
                ) : (
                  <p className="text-sm text-gray-500">Не подключён</p>
                )}
              </div>
            </div>
            
            {!telegramBound && (
              <button
                onClick={handleBindTelegram}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {loading ? '...' : 'Подключить'}
              </button>
            )}
          </div>
          
          <p className="mt-3 text-xs text-gray-500">
            Подключите Telegram для получения уведомлений о заказах, баллах и акциях
          </p>
        </div>
        
        {/* 菜单列表 */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <button
            onClick={() => setLocation('/orders')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="font-medium text-gray-800">Мои заказы</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          
          <button
            onClick={() => setLocation('/membership')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⭐</span>
              <span className="font-medium text-gray-800">Мои баллы</span>
            </div>
            <span className="text-amber-500 font-bold">1 258</span>
          </button>
          
          <button
            onClick={() => setLocation('/coupons')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎟️</span>
              <span className="font-medium text-gray-800">Мои купоны</span>
            </div>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">3</span>
          </button>
          
          <button
            onClick={() => setLocation('/settings')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <span className="font-medium text-gray-800">Настройки</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
        
        {/* 提现历史 */}
        {withdrawHistory.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4">История выводов</h3>
            <div className="space-y-3">
              {withdrawHistory.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{item.amount.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-xs text-gray-500">{item.methodName}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                    item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.statusName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 退出按钮 */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-red-50 rounded-xl font-semibold text-red-600 hover:bg-red-100 transition-all"
        >
          🚪 Выйти из аккаунта
        </button>
      </div>
      
      {/* 提现弹窗 */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Вывод средств</h2>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* 金额输入 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Сумма вывода</label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-4 text-2xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Доступно: {balance.toLocaleString('ru-RU')} ₽</p>
            </div>
            
            {/* 提现方式 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Способ вывода</label>
              <div className="grid grid-cols-3 gap-2">
                {WITHDRAW_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setWithdrawMethod(method.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      withdrawMethod === method.id 
                        ? 'border-amber-500 bg-amber-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{method.icon}</span>
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 账户信息 */}
            <div className="mb-6">
              <label className="block text-sm text-gray-600 mb-2">Номер карты / телефон</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="4276 **** **** ****"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
            
            {/* 提交按钮 */}
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Обработка...' : 'Отправить заявку'}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              ⚠️ Заявка будет обработана в течение 1-3 рабочих дней
            </p>
          </div>
        </div>
      )}
      
      {/* 新用户 Telegram 绑定引导弹窗 */}
      {showTelegramWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Добро пожаловать!</h2>
              <p className="text-gray-600 mb-6">
                Вы успешно зарегистрировались! Подключите Telegram, чтобы получать уведомления о заказах, акциях и бонусах.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowTelegramWelcome(false);
                    handleBindTelegram();
                  }}
                  className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📱</span>
                  Подключить Telegram
                </button>
                
                <button
                  onClick={() => setShowTelegramWelcome(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 transition-all"
                >
                  Позже
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Telegram 绑定弹窗 */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Подключение Telegram</h2>
              <p className="text-gray-600 mb-6">
                Откройте Telegram и нажмите "Start" в нашем боте для завершения привязки
              </p>
              
              <button
                onClick={() => setShowTelegramModal(false)}
                className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
