import React from 'react';
import { ProductFormData } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ProductFormData>) => void;
}

export default function BasicInfoTab({ data, errors, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* 产品名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例如：多肉葡萄"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* 产品编码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品编码 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.code ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例如：PROD_001"
          />
          {errors.code && (
            <p className="text-red-500 text-sm mt-1">{errors.code}</p>
          )}
        </div>

        {/* 分类 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品分类 <span className="text-red-500">*</span>
          </label>
          <select
            value={data.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.categoryId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">请选择分类</option>
            <option value="cat_fruit_tea">水果茶</option>
            <option value="cat_milk_tea">奶茶</option>
            <option value="cat_coffee">咖啡</option>
            <option value="cat_snacks">小吃</option>
          </select>
          {errors.categoryId && (
            <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
          )}
        </div>

        {/* 基础价格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            基础价格 (₽) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={data.basePrice}
            onChange={(e) => onChange({ basePrice: parseFloat(e.target.value) || 0 })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.basePrice ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="290"
            min="0"
            step="1"
          />
          {errors.basePrice && (
            <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
          )}
        </div>

        {/* 成本价 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            成本价 (₽)
          </label>
          <input
            type="number"
            value={data.costPrice}
            onChange={(e) => onChange({ costPrice: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="150"
            min="0"
            step="1"
          />
          <p className="text-sm text-gray-500 mt-1">
            毛利润：₽ {(data.basePrice - data.costPrice).toFixed(2)}
          </p>
        </div>

        {/* 状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品状态
          </label>
          <div className="flex items-center space-x-6 mt-3">
            <label className="flex items-center">
              <input
                type="radio"
                checked={data.status === 'ACTIVE'}
                onChange={() => onChange({ status: 'ACTIVE' })}
                className="mr-2"
              />
              <span className="text-green-600">● 在售</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={data.status === 'INACTIVE'}
                onChange={() => onChange({ status: 'INACTIVE' })}
                className="mr-2"
              />
              <span className="text-gray-500">○ 停售</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
