import React from "react";
import {
  ProductFormData,
  ProductSpecOption,
  SpecValue,
} from "../../../types/product-editor.types";

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

export default function SpecOptionsTab({ data, onChange }: Props) {
  const addSpecOption = () => {
    const newSpec: ProductSpecOption = {
      id: `spec_${Date.now()}`,
      type: "SIZE",
      name: "尺寸",
      values: [],
    };
    onChange({ specOptions: [...data.specOptions, newSpec] });
  };

  const updateSpecOption = (
    index: number,
    updates: Partial<ProductSpecOption>
  ) => {
    const newSpecs = [...data.specOptions];
    newSpecs[index] = { ...newSpecs[index], ...updates };
    onChange({ specOptions: newSpecs });
  };

  const removeSpecOption = (index: number) => {
    const newSpecs = data.specOptions.filter((_, i) => i !== index);
    onChange({ specOptions: newSpecs });
  };

  const addSpecValue = (specIndex: number) => {
    const newValue: SpecValue = {
      id: `value_${Date.now()}`,
      label: "",
      priceAdjustment: 0,
      isDefault: false,
    };
    const newSpecs = [...data.specOptions];
    newSpecs[specIndex].values = [...newSpecs[specIndex].values, newValue];
    onChange({ specOptions: newSpecs });
  };

  const updateSpecValue = (
    specIndex: number,
    valueIndex: number,
    updates: Partial<SpecValue>
  ) => {
    const newSpecs = [...data.specOptions];
    newSpecs[specIndex].values[valueIndex] = {
      ...newSpecs[specIndex].values[valueIndex],
      ...updates,
    };
    onChange({ specOptions: newSpecs });
  };

  const removeSpecValue = (specIndex: number, valueIndex: number) => {
    const newSpecs = [...data.specOptions];
    newSpecs[specIndex].values = newSpecs[specIndex].values.filter(
      (_, i) => i !== valueIndex
    );
    onChange({ specOptions: newSpecs });
  };

  const setDefaultValue = (specIndex: number, valueIndex: number) => {
    const newSpecs = [...data.specOptions];
    newSpecs[specIndex].values = newSpecs[specIndex].values.map((v, i) => ({
      ...v,
      isDefault: i === valueIndex,
    }));
    onChange({ specOptions: newSpecs });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">规格选项配置</h3>
          <p className="text-sm text-gray-500 mt-1">
            配置产品的尺寸、温度、糖度、冰量等规格选项
          </p>
        </div>
        <button
          onClick={addSpecOption}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加规格组
        </button>
      </div>

      {data.specOptions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无规格选项，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.specOptions.map((spec, specIndex) => (
            <div
              key={spec.id}
              className="border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      规格类型
                    </label>
                    <select
                      value={spec.type}
                      onChange={e =>
                        updateSpecOption(specIndex, {
                          type: e.target.value as ProductSpecOption["type"],
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SIZE">尺寸 (SIZE)</option>
                      <option value="TEMPERATURE">温度 (TEMPERATURE)</option>
                      <option value="SWEETNESS">糖度 (SWEETNESS)</option>
                      <option value="ICE">冰量 (ICE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      显示名称
                    </label>
                    <input
                      type="text"
                      value={spec.name}
                      onChange={e =>
                        updateSpecOption(specIndex, { name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：尺寸、温度"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeSpecOption(specIndex)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  🗑️ 删除
                </button>
              </div>

              {/* 规格值列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    规格值
                  </label>
                  <button
                    onClick={() => addSpecValue(specIndex)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 添加选项
                  </button>
                </div>

                {spec.values.map((value, valueIndex) => (
                  <div key={value.id} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={value.label}
                      onChange={e =>
                        updateSpecValue(specIndex, valueIndex, {
                          label: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="选项名称（如：大杯、热饮）"
                    />
                    <input
                      type="number"
                      value={value.priceAdjustment}
                      onChange={e =>
                        updateSpecValue(specIndex, valueIndex, {
                          priceAdjustment: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="价格调整"
                      step="1"
                    />
                    <label className="flex items-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={value.isDefault}
                        onChange={e => {
                          if (e.target.checked) {
                            setDefaultValue(specIndex, valueIndex);
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">默认</span>
                    </label>
                    <button
                      onClick={() => removeSpecValue(specIndex, valueIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {spec.values.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    暂无选项，点击上方按钮添加
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
