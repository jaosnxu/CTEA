import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'wouter';
import { ProductFormData } from '../../types/product-editor.types';
import BasicInfoTab from './ProductEditorTabs/BasicInfoTab';
import MultiLangTab from './ProductEditorTabs/MultiLangTab';
import SpecOptionsTab from './ProductEditorTabs/SpecOptionsTab';
import ToppingsTab from './ProductEditorTabs/ToppingsTab';
import ImagesTab from './ProductEditorTabs/ImagesTab';
import PricingRulesTab from './ProductEditorTabs/PricingRulesTab';
import InventoryTab from './ProductEditorTabs/InventoryTab';
import MarketingTab from './ProductEditorTabs/MarketingTab';

const TABS = [
  { id: 'basic', label: '基础信息', icon: '📝' },
  { id: 'multilang', label: '多语言', icon: '🌍' },
  { id: 'specs', label: '规格选项', icon: '📏' },
  { id: 'toppings', label: '小料配置', icon: '🧋' },
  { id: 'images', label: '图片管理', icon: '🖼️' },
  { id: 'pricing', label: '定价规则', icon: '💰' },
  { id: 'inventory', label: '库存管理', icon: '📦' },
  { id: 'marketing', label: '营销设置', icon: '🎁' },
];

export default function ProductEditor() {
  const params = useParams();
  const id = params.id;
  const [, navigate] = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    code: '',
    categoryId: '',
    basePrice: 0,
    costPrice: 0,
    status: 'ACTIVE',
    nameMultiLang: {},
    descriptionMultiLang: {},
    specOptions: [],
    toppings: [],
    images: [],
    pricingRuleIds: [],
    inventory: [],
    memberDiscounts: [],
    couponIds: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载产品数据（如果是编辑模式）
  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      const result = await response.json();
      if (result.success) {
        setFormData(result.data);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '产品名称不能为空';
    }

    if (!formData.code.trim()) {
      newErrors.code = '产品编码不能为空';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = '请选择分类';
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = '基础价格必须大于 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (closeAfterSave: boolean = false) => {
    if (!validateForm()) {
      alert('请检查表单错误');
      return;
    }

    setIsSaving(true);

    try {
      const url = id
        ? `/api/admin/products/${id}`
        : '/api/admin/products';
      
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert('保存成功！');
        
        if (closeAfterSave) {
          navigate('/admin/products');
        } else if (!id && result.data.id) {
          // 如果是新建，保存后跳转到编辑页面
          navigate(`/admin/products/edit/${result.data.id}`);
        }
      } else {
        alert(`保存失败：${result.message}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates: Partial<ProductFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <BasicInfoTab
            data={formData}
            errors={errors}
            onChange={updateFormData}
          />
        );
      case 'multilang':
        return (
          <MultiLangTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'specs':
        return (
          <SpecOptionsTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'toppings':
        return (
          <ToppingsTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'images':
        return (
          <ImagesTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'pricing':
        return (
          <PricingRulesTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'inventory':
        return (
          <InventoryTab
            data={formData}
            onChange={updateFormData}
          />
        );
      case 'marketing':
        return (
          <MarketingTab
            data={formData}
            onChange={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页头 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {id ? '编辑产品' : '新建产品'}
              </h1>
              {formData.name && (
                <p className="text-sm text-gray-500 mt-1">
                  {formData.name} {formData.code && `(${formData.code})`}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/admin/products')}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕ 关闭
            </button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab 内容 */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin/products')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <div className="flex space-x-4">
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-6 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存并关闭'}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存并继续'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
