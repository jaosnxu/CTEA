/**
 * CHUTEA 智慧中台 - 后台产品管理页面
 *
 * 功能：
 * 1. 产品列表展示
 * 2. 统计信息卡片
 * 3. 产品上架/下架操作
 */

import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

// ==================== 类型定义 ====================

interface Product {
  id: number;
  name: string;
  nameRu?: string;
  nameZh?: string;
  category: string;
  price: number;
  stock: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalStock: number;
  lowStockCount: number;
  categories: number;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление товарами",
    subtitle: "Просмотр и управление товарами",
    table: {
      id: "ID",
      name: "Название",
      category: "Категория",
      price: "Цена",
      stock: "Остаток",
      status: "Статус",
      actions: "Действия",
    },
    status: {
      active: "Активен",
      inactive: "Неактивен",
    },
    actions: {
      activate: "Активировать",
      deactivate: "Деактивировать",
    },
    stats: {
      totalProducts: "Всего товаров",
      activeProducts: "Активных",
      inactiveProducts: "Неактивных",
      totalStock: "Общий остаток",
      lowStock: "Мало на складе",
      categories: "Категорий",
    },
    loading: "Загрузка...",
    noData: "Нет данных",
    error: "Ошибка загрузки данных",
    success: "Статус обновлён",
  },
  zh: {
    title: "产品管理",
    subtitle: "查看和管理产品列表",
    table: {
      id: "ID",
      name: "名称",
      category: "分类",
      price: "价格",
      stock: "库存",
      status: "状态",
      actions: "操作",
    },
    status: {
      active: "上架",
      inactive: "下架",
    },
    actions: {
      activate: "上架",
      deactivate: "下架",
    },
    stats: {
      totalProducts: "总产品数",
      activeProducts: "已上架",
      inactiveProducts: "已下架",
      totalStock: "总库存",
      lowStock: "库存预警",
      categories: "分类数",
    },
    loading: "加载中...",
    noData: "暂无数据",
    error: "数据加载失败",
    success: "状态已更新",
  },
};

// ==================== 主页面组件 ====================

export default function ProductList() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载产品列表
      const productsRes = await fetch("/api/admin/products");
      const productsData = await productsRes.json();
      if (productsData.success !== false) {
        setProducts(productsData.data || productsData || []);
        console.log("[后台] 数据加载成功");
      }

      // 加载统计信息
      const statsRes = await fetch("/api/admin/products/stats/summary");
      const statsData = await statsRes.json();
      if (statsData.success !== false) {
        setStats(statsData.data || statsData || null);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setMessage({ type: "error", text: t.error });
    } finally {
      setLoading(false);
    }
  };

  // 切换产品状态
  const toggleProductStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`/api/admin/products/${product.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success !== false) {
        setProducts(
          products.map(p =>
            p.id === product.id ? { ...p, status: newStatus } : p
          )
        );
        setMessage({ type: "success", text: t.success });
      } else {
        setMessage({ type: "error", text: data.error?.message || t.error });
      }
    } catch (error) {
      setMessage({ type: "error", text: t.error });
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
              onClick={() => setLang(lang === "ru" ? "zh" : "ru")}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              {lang === "ru" ? "中文" : "Русский"}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? "OK" : "Error"}: {message.text}
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalProducts || 0}
              </div>
              <div className="text-sm text-gray-500">
                {t.stats.totalProducts}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {stats.activeProducts || 0}
              </div>
              <div className="text-sm text-gray-500">
                {t.stats.activeProducts}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">
                {stats.inactiveProducts || 0}
              </div>
              <div className="text-sm text-gray-500">
                {t.stats.inactiveProducts}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalStock || 0}
              </div>
              <div className="text-sm text-gray-500">{t.stats.totalStock}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.lowStockCount || 0}
              </div>
              <div className="text-sm text-gray-500">{t.stats.lowStock}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {stats.categories || 0}
              </div>
              <div className="text-sm text-gray-500">{t.stats.categories}</div>
            </div>
          </div>
        )}

        {/* 产品列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  {t.table.id}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  {t.table.name}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  {t.table.category}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  {t.table.price}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  {t.table.stock}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                  {t.table.status}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                  {t.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.loading}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t.noData}
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {product.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {lang === "ru"
                        ? product.nameRu || product.name
                        : product.nameZh || product.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {typeof product.price === "number"
                        ? product.price.toFixed(0)
                        : product.price}{" "}
                      ₽
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {product.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.status === "active"
                          ? t.status.active
                          : t.status.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleProductStatus(product)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          product.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {product.status === "active"
                          ? t.actions.deactivate
                          : t.actions.activate}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
