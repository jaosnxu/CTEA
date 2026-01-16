import React from 'react';
import { ProductFormData, ProductImage } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

export default function ImagesTab({ data, onChange }: Props) {
  const addImage = () => {
    const newImage: ProductImage = {
      id: `img_${Date.now()}`,
      url: '',
      isPrimary: data.images.length === 0,
      sortOrder: data.images.length,
    };
    onChange({ images: [...data.images, newImage] });
  };

  const updateImage = (index: number, updates: Partial<ProductImage>) => {
    const newImages = [...data.images];
    newImages[index] = { ...newImages[index], ...updates };
    onChange({ images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = data.images.filter((_, i) => i !== index);
    // 如果删除的是主图，设置第一张为主图
    if (data.images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    onChange({ images: newImages });
  };

  const setPrimaryImage = (index: number) => {
    const newImages = data.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange({ images: newImages });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...data.images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    
    // 更新排序
    newImages.forEach((img, i) => {
      img.sortOrder = i;
    });
    
    onChange({ images: newImages });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">图片管理</h3>
          <p className="text-sm text-gray-500 mt-1">
            上传产品图片，第一张为主图，其他为详情图
          </p>
        </div>
        <button
          onClick={addImage}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加图片
        </button>
      </div>

      {data.images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无图片，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.images.map((image, index) => (
            <div
              key={image.id}
              className={`border rounded-lg p-4 ${
                image.isPrimary ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 图片预览 */}
                <div className="flex-shrink-0">
                  {image.url ? (
                    <img
                      src={image.url}
                      alt="Product"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E无图片%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                      无图片
                    </div>
                  )}
                </div>

                {/* 图片信息 */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      图片 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={image.url}
                      onChange={(e) => updateImage(index, { url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/product.jpg"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={image.isPrimary}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPrimaryImage(index);
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {image.isPrimary ? '🌟 主图' : '设为主图'}
                      </span>
                    </label>

                    <span className="text-sm text-gray-500">排序：{index + 1}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => moveImage(index, 'up')}
                    disabled={index === 0}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveImage(index, 'down')}
                    disabled={index === data.images.length - 1}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeImage(index)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
