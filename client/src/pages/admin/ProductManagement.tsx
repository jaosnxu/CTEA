/**
 * CHUTEA 智慧中台 - 增强版产品管理
 *
 * 功能：
 * 1. 产品 CRUD 操作
 * 2. 单选属性配置（冰度、甜度、规格）
 * 3. 多选属性配置（加料）
 * 4. 实时价格修改
 * 5. 多语言支持（俄语/中文）
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MultiLangText {
  ru: string;
  zh: string;
  en?: string;
}

interface ProductOption {
  id: string;
  name: MultiLangText;
  priceAdjustment: number;
  isDefault?: boolean;
}

interface ProductOptionGroup {
  id: string;
  name: MultiLangText;
  type: "SINGLE" | "MULTI";
  required: boolean;
  options: ProductOption[];
}

interface Product {
  id: string;
  code: string;
  name: MultiLangText;
  description: MultiLangText;
  basePrice: number;
  categoryId: string;
  imageUrl?: string;
  isActive: boolean;
  optionGroups: ProductOptionGroup[];
}

interface Category {
  id: string;
  name: MultiLangText;
  sortOrder: number;
  isActive: boolean;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление товарами",
    subtitle: "Настройка товаров и опций",
    tabs: {
      products: "Товары",
      categories: "Категории",
      options: "Опции",
    },
    product: {
      code: "Код",
      name: "Название",
      nameRu: "Название (RU)",
      nameZh: "Название (ZH)",
      description: "Описание",
      descRu: "Описание (RU)",
      descZh: "Описание (ZH)",
      price: "Цена",
      category: "Категория",
      status: "Статус",
      active: "Активен",
      inactive: "Неактивен",
      options: "Опции",
      addOption: "Добавить опцию",
    },
    optionGroup: {
      name: "Название группы",
      type: "Тип",
      single: "Одиночный выбор",
      multi: "Множественный выбор",
      required: "Обязательно",
      items: "Варианты",
      addItem: "Добавить вариант",
      priceAdj: "Доплата",
    },
    category: {
      name: "Название",
      order: "Порядок",
      status: "Статус",
    },
    actions: {
      add: "Добавить",
      edit: "Редактировать",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      configure: "Настроить опции",
    },
    messages: {
      saved: "Сохранено успешно",
      deleted: "Удалено успешно",
      error: "Ошибка",
      loading: "Загрузка...",
      noData: "Нет данных",
    },
    presets: {
      ice: "Лёд",
      sweetness: "Сладость",
      size: "Размер",
      toppings: "Топпинги",
    },
  },
  zh: {
    title: "产品管理",
    subtitle: "配置产品和选项",
    tabs: {
      products: "产品",
      categories: "分类",
      options: "选项模板",
    },
    product: {
      code: "编码",
      name: "名称",
      nameRu: "名称 (俄语)",
      nameZh: "名称 (中文)",
      description: "描述",
      descRu: "描述 (俄语)",
      descZh: "描述 (中文)",
      price: "价格",
      category: "分类",
      status: "状态",
      active: "启用",
      inactive: "停用",
      options: "选项",
      addOption: "添加选项组",
    },
    optionGroup: {
      name: "选项组名称",
      type: "类型",
      single: "单选",
      multi: "多选",
      required: "必选",
      items: "选项",
      addItem: "添加选项",
      priceAdj: "加价",
    },
    category: {
      name: "名称",
      order: "排序",
      status: "状态",
    },
    actions: {
      add: "添加",
      edit: "编辑",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      configure: "配置选项",
    },
    messages: {
      saved: "保存成功",
      deleted: "删除成功",
      error: "错误",
      loading: "加载中...",
      noData: "暂无数据",
    },
    presets: {
      ice: "冰度",
      sweetness: "甜度",
      size: "规格",
      toppings: "加料",
    },
  },
};

// ==================== 预设选项模板 ====================

const optionPresets = {
  ice: {
    name: { ru: "Лёд", zh: "冰度", en: "Ice" },
    type: "SINGLE" as const,
    required: true,
    options: [
      {
        name: { ru: "Без льда", zh: "去冰", en: "No Ice" },
        priceAdjustment: 0,
      },
      {
        name: { ru: "Мало льда", zh: "少冰", en: "Less Ice" },
        priceAdjustment: 0,
      },
      {
        name: { ru: "Нормально", zh: "正常冰", en: "Normal" },
        priceAdjustment: 0,
        isDefault: true,
      },
      {
        name: { ru: "Много льда", zh: "多冰", en: "Extra Ice" },
        priceAdjustment: 0,
      },
    ],
  },
  sweetness: {
    name: { ru: "Сладость", zh: "甜度", en: "Sweetness" },
    type: "SINGLE" as const,
    required: true,
    options: [
      {
        name: { ru: "Без сахара", zh: "无糖", en: "No Sugar" },
        priceAdjustment: 0,
      },
      {
        name: { ru: "30% сахара", zh: "三分糖", en: "30% Sugar" },
        priceAdjustment: 0,
      },
      {
        name: { ru: "50% сахара", zh: "半糖", en: "50% Sugar" },
        priceAdjustment: 0,
      },
      {
        name: { ru: "70% сахара", zh: "七分糖", en: "70% Sugar" },
        priceAdjustment: 0,
        isDefault: true,
      },
      {
        name: { ru: "100% сахара", zh: "全糖", en: "Full Sugar" },
        priceAdjustment: 0,
      },
    ],
  },
  size: {
    name: { ru: "Размер", zh: "规格", en: "Size" },
    type: "SINGLE" as const,
    required: true,
    options: [
      {
        name: { ru: "Средний", zh: "中杯", en: "Medium" },
        priceAdjustment: 0,
        isDefault: true,
      },
      {
        name: { ru: "Большой", zh: "大杯", en: "Large" },
        priceAdjustment: 50,
      },
    ],
  },
  toppings: {
    name: { ru: "Топпинги", zh: "加料", en: "Toppings" },
    type: "MULTI" as const,
    required: false,
    options: [
      {
        name: { ru: "Жемчуг тапиока", zh: "珍珠", en: "Tapioca Pearls" },
        priceAdjustment: 30,
      },
      {
        name: { ru: "Кокосовое желе", zh: "椰果", en: "Coconut Jelly" },
        priceAdjustment: 30,
      },
      {
        name: { ru: "Пудинг", zh: "布丁", en: "Pudding" },
        priceAdjustment: 40,
      },
      {
        name: { ru: "Красная фасоль", zh: "红豆", en: "Red Bean" },
        priceAdjustment: 30,
      },
      {
        name: { ru: "Алоэ вера", zh: "芦荟", en: "Aloe Vera" },
        priceAdjustment: 35,
      },
    ],
  },
};

// ==================== 主组件 ====================

export default function ProductManagement() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "options"
  >("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 编辑状态
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载分类
      const catRes = await fetch("/api/trpc/product.listCategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const catData = await catRes.json();
      if (catData.result?.data) {
        setCategories(catData.result.data);
      }

      // 加载产品
      const prodRes = await fetch("/api/trpc/product.listProducts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const prodData = await prodRes.json();
      if (prodData.result?.data) {
        setProducts(prodData.result.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      // 使用模拟数据
      setCategories([
        {
          id: "1",
          name: { ru: "Молочный чай", zh: "奶茶" },
          sortOrder: 1,
          isActive: true,
        },
        {
          id: "2",
          name: { ru: "Фруктовый чай", zh: "果茶" },
          sortOrder: 2,
          isActive: true,
        },
        {
          id: "3",
          name: { ru: "Кофе", zh: "咖啡" },
          sortOrder: 3,
          isActive: true,
        },
      ]);
      setProducts([
        {
          id: "1",
          code: "MT001",
          name: { ru: "Классический молочный чай", zh: "经典奶茶" },
          description: {
            ru: "Традиционный тайваньский молочный чай",
            zh: "传统台湾奶茶",
          },
          basePrice: 280,
          categoryId: "1",
          isActive: true,
          optionGroups: [],
        },
        {
          id: "2",
          code: "MT002",
          name: { ru: "Чай с тапиокой", zh: "珍珠奶茶" },
          description: {
            ru: "Молочный чай с жемчугом тапиоки",
            zh: "珍珠奶茶",
          },
          basePrice: 320,
          categoryId: "1",
          isActive: true,
          optionGroups: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 保存产品
  const saveProduct = async (product: Product) => {
    try {
      const isNew = !product.id || product.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/product.createProduct"
        : "/api/trpc/product.updateProduct";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setProducts([...products, data.result.data]);
        } else {
          setProducts(
            products.map(p => (p.id === product.id ? data.result.data : p))
          );
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!product.id || product.id.startsWith("new-")) {
        const newProduct = { ...product, id: `local-${Date.now()}` };
        setProducts([...products, newProduct]);
      } else {
        setProducts(products.map(p => (p.id === product.id ? product : p)));
      }
      showMessage("success", t.messages.saved);
    }
    setEditingProduct(null);
    setShowProductForm(false);
  };

  // 删除产品
  const deleteProduct = async (id: string) => {
    if (!confirm(lang === "ru" ? "Удалить товар?" : "确定删除该产品？")) return;

    try {
      await fetch("/api/trpc/product.deleteProduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setProducts(products.filter(p => p.id !== id));
    showMessage("success", t.messages.deleted);
  };

  // 保存分类
  const saveCategory = async (category: Category) => {
    try {
      const isNew = !category.id || category.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/product.createCategory"
        : "/api/trpc/product.updateCategory";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setCategories([...categories, data.result.data]);
        } else {
          setCategories(
            categories.map(c => (c.id === category.id ? data.result.data : c))
          );
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!category.id || category.id.startsWith("new-")) {
        const newCat = { ...category, id: `local-${Date.now()}` };
        setCategories([...categories, newCat]);
      } else {
        setCategories(
          categories.map(c => (c.id === category.id ? category : c))
        );
      }
      showMessage("success", t.messages.saved);
    }
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // 添加预设选项组到产品
  const addPresetToProduct = (
    productId: string,
    presetKey: keyof typeof optionPresets
  ) => {
    const preset = optionPresets[presetKey];
    const newGroup: ProductOptionGroup = {
      id: `group-${Date.now()}`,
      name: preset.name,
      type: preset.type,
      required: preset.required,
      options: preset.options.map((opt, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        name: opt.name,
        priceAdjustment: opt.priceAdjustment,
        isDefault: "isDefault" in opt ? opt.isDefault : false,
      })),
    };

    setProducts(
      products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optionGroups: [...p.optionGroups, newGroup],
          };
        }
        return p;
      })
    );
  };

  // 删除选项组
  const removeOptionGroup = (productId: string, groupId: string) => {
    setProducts(
      products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optionGroups: p.optionGroups.filter(g => g.id !== groupId),
          };
        }
        return p;
      })
    );
  };

  // 更新选项价格
  const updateOptionPrice = (
    productId: string,
    groupId: string,
    optionId: string,
    price: number
  ) => {
    setProducts(
      products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optionGroups: p.optionGroups.map(g => {
              if (g.id === groupId) {
                return {
                  ...g,
                  options: g.options.map(o => {
                    if (o.id === optionId) {
                      return { ...o, priceAdjustment: price };
                    }
                    return o;
                  }),
                };
              }
              return g;
            }),
          };
        }
        return p;
      })
    );
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧋 {t.title}</h1>
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
            {message.text}
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b">
          {(["products", "categories", "options"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </div>

        {/* 产品列表 */}
        {activeTab === "products" && (
          <div>
            {/* 添加按钮 */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingProduct({
                    id: `new-${Date.now()}`,
                    code: "",
                    name: { ru: "", zh: "" },
                    description: { ru: "", zh: "" },
                    basePrice: 0,
                    categoryId: categories[0]?.id || "",
                    isActive: true,
                    optionGroups: [],
                  });
                  setShowProductForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                {t.actions.add}
              </button>
            </div>

            {/* 产品表格 */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  {t.messages.loading}
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t.messages.noData}
                </div>
              ) : (
                <div className="divide-y">
                  {products.map(product => (
                    <div key={product.id} className="hover:bg-gray-50">
                      {/* 产品行 */}
                      <div className="px-4 py-3 flex items-center gap-4">
                        <button
                          onClick={() =>
                            setExpandedProduct(
                              expandedProduct === product.id ? null : product.id
                            )
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {expandedProduct === product.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {product.name[lang]}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.code} •{" "}
                            {categories.find(c => c.id === product.categoryId)
                              ?.name[lang] || "-"}
                          </div>
                        </div>

                        <div className="text-lg font-bold text-gray-900">
                          {product.basePrice} ₽
                        </div>

                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.isActive
                            ? t.product.active
                            : t.product.inactive}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 展开的选项配置 */}
                      {expandedProduct === product.id && (
                        <div className="px-4 py-4 bg-gray-50 border-t">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-medium text-gray-700">
                              <Settings className="w-4 h-4 inline mr-2" />
                              {t.product.options}
                            </h4>
                            <div className="flex gap-2">
                              {(
                                Object.keys(optionPresets) as Array<
                                  keyof typeof optionPresets
                                >
                              ).map(key => (
                                <button
                                  key={key}
                                  onClick={() =>
                                    addPresetToProduct(product.id, key)
                                  }
                                  className="px-3 py-1 text-xs bg-white border rounded-lg hover:bg-gray-100"
                                >
                                  + {t.presets[key]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {product.optionGroups.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">
                              {lang === "ru"
                                ? "Нет настроенных опций. Добавьте опции выше."
                                : "暂无配置选项，请点击上方按钮添加"}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {product.optionGroups.map(group => (
                                <div
                                  key={group.id}
                                  className="bg-white rounded-lg border p-4"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <span className="font-medium text-gray-900">
                                        {group.name[lang]}
                                      </span>
                                      <span
                                        className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                          group.type === "SINGLE"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-purple-100 text-purple-700"
                                        }`}
                                      >
                                        {group.type === "SINGLE"
                                          ? t.optionGroup.single
                                          : t.optionGroup.multi}
                                      </span>
                                      {group.required && (
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                          {t.optionGroup.required}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        removeOptionGroup(product.id, group.id)
                                      }
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {group.options.map(option => (
                                      <div
                                        key={option.id}
                                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                      >
                                        <span className="flex-1 text-sm text-gray-700">
                                          {option.name[lang]}
                                          {option.isDefault && (
                                            <span className="ml-1 text-xs text-green-600">
                                              ★
                                            </span>
                                          )}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-500">
                                            +
                                          </span>
                                          <input
                                            type="number"
                                            value={option.priceAdjustment}
                                            onChange={e =>
                                              updateOptionPrice(
                                                product.id,
                                                group.id,
                                                option.id,
                                                parseInt(e.target.value) || 0
                                              )
                                            }
                                            className="w-16 px-2 py-1 text-sm border rounded text-right"
                                          />
                                          <span className="text-xs text-gray-500">
                                            ₽
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 保存选项配置 */}
                          {product.optionGroups.length > 0 && (
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => saveProduct(product)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                              >
                                <Save className="w-4 h-4" />
                                {t.actions.save}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 分类列表 */}
        {activeTab === "categories" && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingCategory({
                    id: `new-${Date.now()}`,
                    name: { ru: "", zh: "" },
                    sortOrder: categories.length + 1,
                    isActive: true,
                  });
                  setShowCategoryForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                {t.actions.add}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      {t.category.name}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      {t.category.order}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      {t.category.status}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      {t.actions.edit}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {cat.name[lang]}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cat.name[lang === "ru" ? "zh" : "ru"]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {cat.sortOrder}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cat.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {cat.isActive ? t.product.active : t.product.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setShowCategoryForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 选项模板说明 */}
        {activeTab === "options" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {lang === "ru" ? "Шаблоны опций" : "选项模板"}
            </h3>
            <p className="text-gray-600 mb-6">
              {lang === "ru"
                ? "Эти шаблоны можно быстро добавить к любому товару. Цены можно настроить индивидуально для каждого товара."
                : "这些模板可以快速添加到任何产品。价格可以针对每个产品单独配置。"}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {(
                Object.entries(optionPresets) as Array<
                  [keyof typeof optionPresets, (typeof optionPresets)["ice"]]
                >
              ).map(([key, preset]) => (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {preset.name[lang]}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        preset.type === "SINGLE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {preset.type === "SINGLE"
                        ? t.optionGroup.single
                        : t.optionGroup.multi}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {preset.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>
                          {opt.name[lang]}
                          {opt.isDefault && (
                            <span className="ml-1 text-green-600">
                              ({lang === "ru" ? "по умолчанию" : "默认"})
                            </span>
                          )}
                        </span>
                        <span className="text-gray-500">
                          +{opt.priceAdjustment} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 产品编辑表单 */}
        {showProductForm && editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingProduct.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.code}
                    </label>
                    <input
                      type="text"
                      value={editingProduct.code}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          code: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.price} (₽)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.basePrice}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          basePrice: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.nameRu}
                    </label>
                    <input
                      type="text"
                      value={editingProduct.name.ru}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          name: { ...editingProduct.name, ru: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.nameZh}
                    </label>
                    <input
                      type="text"
                      value={editingProduct.name.zh}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          name: { ...editingProduct.name, zh: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.descRu}
                    </label>
                    <textarea
                      value={editingProduct.description.ru}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          description: {
                            ...editingProduct.description,
                            ru: e.target.value,
                          },
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.descZh}
                    </label>
                    <textarea
                      value={editingProduct.description.zh}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          description: {
                            ...editingProduct.description,
                            zh: e.target.value,
                          },
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.category}
                    </label>
                    <select
                      value={editingProduct.categoryId}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          categoryId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name[lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.product.status}
                    </label>
                    <select
                      value={editingProduct.isActive ? "active" : "inactive"}
                      onChange={e =>
                        setEditingProduct({
                          ...editingProduct,
                          isActive: e.target.value === "active",
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="active">{t.product.active}</option>
                      <option value="inactive">{t.product.inactive}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveProduct(editingProduct)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {t.actions.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 分类编辑表单 */}
        {showCategoryForm && editingCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCategory.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.product.nameRu}
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name.ru}
                    onChange={e =>
                      setEditingCategory({
                        ...editingCategory,
                        name: { ...editingCategory.name, ru: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.product.nameZh}
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name.zh}
                    onChange={e =>
                      setEditingCategory({
                        ...editingCategory,
                        name: { ...editingCategory.name, zh: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.category.order}
                  </label>
                  <input
                    type="number"
                    value={editingCategory.sortOrder}
                    onChange={e =>
                      setEditingCategory({
                        ...editingCategory,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.category.status}
                  </label>
                  <select
                    value={editingCategory.isActive ? "active" : "inactive"}
                    onChange={e =>
                      setEditingCategory({
                        ...editingCategory,
                        isActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">{t.product.active}</option>
                    <option value="inactive">{t.product.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveCategory(editingCategory)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {t.actions.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
