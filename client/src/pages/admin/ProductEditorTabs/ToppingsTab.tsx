import React from "react";
import {
  ProductFormData,
  ProductTopping,
} from "../../../types/product-editor.types";

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

export default function ToppingsTab({ data, onChange }: Props) {
  const addTopping = () => {
    const newTopping: ProductTopping = {
      id: `topping_${Date.now()}`,
      name: "",
      price: 0,
      stock: 0,
      maxQuantity: 3,
    };
    onChange({ toppings: [...data.toppings, newTopping] });
  };

  const updateTopping = (index: number, updates: Partial<ProductTopping>) => {
    const newToppings = [...data.toppings];
    newToppings[index] = { ...newToppings[index], ...updates };
    onChange({ toppings: newToppings });
  };

  const removeTopping = (index: number) => {
    const newToppings = data.toppings.filter((_, i) => i !== index);
    onChange({ toppings: newToppings });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">小料配置</h3>
          <p className="text-sm text-gray-500 mt-1">
            配置可选的小料、配料，如珍珠、椰果、布丁等
          </p>
        </div>
        <button
          onClick={addTopping}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加小料
        </button>
      </div>

      {data.toppings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无小料配置，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data.toppings.map((topping, index) => (
            <div
              key={topping.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    小料名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={topping.name}
                    onChange={e =>
                      updateTopping(index, { name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：珍珠、椰果"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    价格 (₽)
                  </label>
                  <input
                    type="number"
                    value={topping.price}
                    onChange={e =>
                      updateTopping(index, {
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    min="0"
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    库存
                  </label>
                  <input
                    type="number"
                    value={topping.stock}
                    onChange={e =>
                      updateTopping(index, {
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大数量
                  </label>
                  <input
                    type="number"
                    value={topping.maxQuantity}
                    onChange={e =>
                      updateTopping(index, {
                        maxQuantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                    min="1"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    图片 URL（可选）
                  </label>
                  <input
                    type="text"
                    value={topping.image || ""}
                    onChange={e =>
                      updateTopping(index, { image: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/topping.jpg"
                  />
                </div>
                <button
                  onClick={() => removeTopping(index)}
                  className="ml-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
