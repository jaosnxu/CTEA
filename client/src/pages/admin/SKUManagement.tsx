/**
 * CHUTEA 智慧中台 - SKU 原子化管理
 * 
 * 功能：
 * 1. SKU 列表展示
 * 2. 渠道开关（TV/App/Web）
 * 3. 库存预警
 * 4. 门店配置
 */

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

// ==================== 类型定义 ====================

interface SKU {
  id: number;
  code: string;
  name: { ru: string; zh: string };
  category: string;
  basePrice: number;
  cost: number;
  unit: string;
  isActive: boolean;
  isAvailableOnTV: boolean;
  isAvailableOnApp: boolean;
  isAvailableOnWeb: boolean;
  stockQuantity: number;
  minStock: number;
}

interface Store {
  id: number;
  code: string;
  name: { ru: string; zh: string };
  status: string;
  tvEnabled: boolean;
  deliveryEnabled: boolean;
}

interface InventoryAlert {
  id: number;
  skuCode: string;
  skuName: { ru: string; zh: string };
  currentStock: number;
  minStock: number;
  status: string;
  storeName: { ru: string; zh: string };
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: 'Управление SKU',
    subtitle: 'Атомарное управление товарами',
    tabs: {
      skus: 'Товары',
      stores: 'Магазины',
      alerts: 'Предупреждения',
    },
    sku: {
      code: 'Код',
      name: 'Название',
      price: 'Цена',
      cost: 'Себестоимость',
      stock: 'Остаток',
      status: 'Статус',
      channels: 'Каналы',
      tv: 'TV',
      app: 'App',
      web: 'Web',
      active: 'Активен',
      inactive: 'Неактивен',
    },
    store: {
      code: 'Код',
      name: 'Название',
      status: 'Статус',
      tv: 'TV',
      delivery: 'Доставка',
      pickup: 'Самовывоз',
    },
    alert: {
      sku: 'Товар',
      store: 'Магазин',
      current: 'Текущий',
      min: 'Минимум',
      status: 'Статус',
      critical: 'Критический',
      low: 'Низкий',
    },
    actions: {
      save: 'Сохранить',
      edit: 'Редактировать',
    },
    stats: {
      totalSKUs: 'Всего SKU',
      activeSKUs: 'Активных SKU',
      totalStores: 'Всего магазинов',
      activeStores: 'Активных магазинов',
      alerts: 'Предупреждений',
      critical: 'Критических',
    },
    success: 'Сохранено',
    error: 'Ошибка',
  },
  zh: {
    title: 'SKU 管理',
    subtitle: '商品原子化管理',
    tabs: {
      skus: '商品',
      stores: '门店',
      alerts: '预警',
    },
    sku: {
      code: '编码',
      name: '名称',
      price: '价格',
      cost: '成本',
      stock: '库存',
      status: '状态',
      channels: '渠道',
      tv: 'TV',
      app: 'App',
      web: 'Web',
      active: '启用',
      inactive: '停用',
    },
    store: {
      code: '编码',
      name: '名称',
      status: '状态',
      tv: 'TV',
      delivery: '配送',
      pickup: '自取',
    },
    alert: {
      sku: '商品',
      store: '门店',
      current: '当前',
      min: '最低',
      status: '状态',
      critical: '严重',
      low: '偏低',
    },
    actions: {
      save: '保存',
      edit: '编辑',
    },
    stats: {
      totalSKUs: '总 SKU',
      activeSKUs: '启用 SKU',
      totalStores: '总门店',
      activeStores: '营业门店',
      alerts: '预警数',
      critical: '严重预警',
    },
    success: '已保存',
    error: '错误',
  },
};

// ==================== 主页面组件 ====================

export default function SKUManagementPage() {
  const [lang, setLang] = useState<'ru' | 'zh'>('ru');
  const [activeTab, setActiveTab] = useState<'skus' | 'stores' | 'alerts'>('skus');
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载 SKU
      const skuRes = await fetch('/api/operations/skus');
      const skuData = await skuRes.json();
      if (skuData.success) {
        setSKUs(skuData.data.skus);
      }
      
      // 加载门店
      const storeRes = await fetch('/api/operations/stores');
      const storeData = await storeRes.json();
      if (storeData.success) {
        setStores(storeData.data);
      }
      
      // 加载预警
      const alertRes = await fetch('/api/operations/inventory/alerts');
      const alertData = await alertRes.json();
      if (alertData.success) {
        setAlerts(alertData.data.alerts);
      }
      
      // 加载统计
      const statsRes = await fetch('/api/operations/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新 SKU 状态
  const updateSKU = async (id: number, field: string, value: boolean) => {
    try {
      const response = await fetch(`/api/operations/skus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await response.json();
      if (data.success) {
        setSKUs(skus.map(sku => 
          sku.id === id ? { ...sku, [field]: value } : sku
        ));
        setMessage({ type: 'success', text: t.success });
      } else {
        setMessage({ type: 'error', text: data.error?.message || t.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error });
    }
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 {t.title}</h1>
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
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.skus?.total || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.totalSKUs}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{stats.skus?.active || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.activeSKUs}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.stores?.total || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.totalStores}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{stats.stores?.active || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.activeStores}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-yellow-600">{stats.inventory?.alerts || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.alerts}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{stats.inventory?.critical || 0}</div>
              <div className="text-sm text-gray-500">{t.stats.critical}</div>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b">
          {(['skus', 'stores', 'alerts'] as const).map((tab) => (
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
              {tab === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* SKU 列表 */}
        {activeTab === 'skus' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.sku.code}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.sku.name}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t.sku.price}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t.sku.cost}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.sku.channels}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.sku.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {lang === 'ru' ? 'Загрузка...' : '加载中...'}
                    </td>
                  </tr>
                ) : skus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {lang === 'ru' ? 'Нет данных' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  skus.map((sku) => (
                    <tr key={sku.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{sku.code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {typeof sku.name === 'object' ? sku.name[lang] : sku.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sku.basePrice.toFixed(0)} ₽
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {sku.cost.toFixed(0)} ₽
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => updateSKU(sku.id, 'isAvailableOnTV', !sku.isAvailableOnTV)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              sku.isAvailableOnTV
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            📺 TV
                          </button>
                          <button
                            onClick={() => updateSKU(sku.id, 'isAvailableOnApp', !sku.isAvailableOnApp)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              sku.isAvailableOnApp
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            📱 App
                          </button>
                          <button
                            onClick={() => updateSKU(sku.id, 'isAvailableOnWeb', !sku.isAvailableOnWeb)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              sku.isAvailableOnWeb
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            🌐 Web
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => updateSKU(sku.id, 'isActive', !sku.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sku.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {sku.isActive ? t.sku.active : t.sku.inactive}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 门店列表 */}
        {activeTab === 'stores' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.store.code}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.store.name}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.store.tv}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.store.delivery}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.store.pickup}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.store.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {lang === 'ru' ? 'Нет данных' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{store.code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {typeof store.name === 'object' ? store.name[lang] : store.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          store.tvEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          store.deliveryEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          store.deliveryEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          store.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {store.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 库存预警 */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.alert.sku}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t.alert.store}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t.alert.current}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t.alert.min}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t.alert.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {lang === 'ru' ? '✅ Нет предупреждений' : '✅ 暂无预警'}
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {typeof alert.skuName === 'object' ? alert.skuName[lang] : alert.skuName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{alert.skuCode}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {typeof alert.storeName === 'object' ? alert.storeName[lang] : alert.storeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        {alert.currentStock}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {alert.minStock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          alert.status === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {alert.status === 'CRITICAL' ? t.alert.critical : t.alert.low}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
