import React from 'react';
import { ProductFormData } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

export default function MultiLangTab({ data, onChange }: Props) {
  const updateNameLang = (lang: 'zh' | 'ru' | 'en', value: string) => {
    onChange({
      nameMultiLang: {
        ...data.nameMultiLang,
        [lang]: value,
      },
    });
  };

  const updateDescLang = (lang: 'zh' | 'ru' | 'en', value: string) => {
    onChange({
      descriptionMultiLang: {
        ...data.descriptionMultiLang,
        [lang]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* 中文 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🇨🇳 中文 (简体)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品名称
            </label>
            <input
              type="text"
              value={data.nameMultiLang.zh || ''}
              onChange={(e) => updateNameLang('zh', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="多肉葡萄"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品描述
            </label>
            <textarea
              value={data.descriptionMultiLang.zh || ''}
              onChange={(e) => updateDescLang('zh', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="新鲜葡萄搭配Q弹果肉，酸甜可口"
            />
          </div>
        </div>
      </div>

      {/* 俄语 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🇷🇺 俄语 (Русский)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название продукта
            </label>
            <input
              type="text"
              value={data.nameMultiLang.ru || ''}
              onChange={(e) => updateNameLang('ru', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Виноградный фреш с желе"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={data.descriptionMultiLang.ru || ''}
              onChange={(e) => updateDescLang('ru', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Свежий виноград с желе"
            />
          </div>
        </div>
      </div>

      {/* 英语 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🇬🇧 英语 (English)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={data.nameMultiLang.en || ''}
              onChange={(e) => updateNameLang('en', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Grape Jelly Drink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={data.descriptionMultiLang.en || ''}
              onChange={(e) => updateDescLang('en', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Fresh grape with jelly"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
