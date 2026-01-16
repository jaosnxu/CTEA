import React from 'react';
import { ProductFormData, StoreInventory } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

// 模拟的门店列表
const AVAILABLE_STORES = [
  { id: 'store_1', name: '莫斯科旗舰店' },
  { id: 'store_2', name: '圣彼得堡分店' },
  { id: 'store_3', name: '喀山分店' },
  { id: 'store_4', name: '叶卡捷琳堡分店' },
];

export default function InventoryTab({ data, onChange }: Props) {
  const addStore = (storeId: string, storeName: string) => {
    const newInventory: StoreInventory = {
      storeId,
      storeName,
      stock: 0,
      lowStockAlert: 10,
    };
    onChange({ inventory: [...data.inventory, newInventory] });
  };

  const updateInventory = (index: number, updates: Partial<StoreInventory>) => {
    const newInventory = [...data.inventory];
    newInventory[index] = { ...newInventory[index], ...updates };
    onChange({ inventory: newInventory });
  };

  const removeStore = (index: number) => {
    const newInventory = data.inventory.filter((_, i) => i !== index);
    onChange({ inventory: newInventory });
  };

  const availableStores = AVAILABLE_STORES.filter(
    (store) => !data.inventory.some((inv) => inv.storeId === store.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">库存管理</h3>
          <p className="text-sm text-gray-500 mt-1">
            配置各门店的库存数量和预警值
          </p>
        </div>
        {availableStores.length > 0 && (
          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + 添加门店
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {availableStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => addStore(store.id, store.name)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {store.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.inventory.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无库存配置，点击上方按钮添加门店</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">总库存</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {data.inventory.reduce((sum, inv) => sum + inv.stock, 0)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">已配置门店</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {data.inventory.length}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">库存预警</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {data.inventory.filter((inv) => inv.stock <= inv.lowStockAlert).length}
              </div>
            </div>
          </div>

          {/* 门店库存列表 */}
          <div className="space-y-3">
            {data.inventory.map((inventory, index) => (
              <div
                key={inventory.storeId}
                className={`border rounded-lg p-4 ${
                  inventory.stock <= inventory.lowStockAlert
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-48">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span>🏪</span>
                      {inventory.storeName}
                    </div>
                    {inventory.stock <= inventory.lowStockAlert && (
                      <span className="text-xs text-orange-600 mt-1 inline-block">
                        ⚠️ 库存不足
                      </span>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        当前库存
                      </label>
                      <input
                        type="number"
                        value={inventory.stock}
                        onChange={(e) =>
                          updateInventory(index, { stock: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        预警值
                      </label>
                      <input
                        type="number"
                        value={inventory.lowStockAlert}
                        onChange={(e) =>
                          updateInventory(index, {
                            lowStockAlert: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="10"
                        min="0"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeStore(index)}
                    className="flex-shrink-0 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    🗑️ 移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
