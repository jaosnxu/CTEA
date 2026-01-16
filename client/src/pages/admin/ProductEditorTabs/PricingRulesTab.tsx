import React, { useState } from 'react';
import { ProductFormData } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'DISCOUNT' | 'MARKUP' | 'FIXED';
}

// 模拟的定价规则列表
const AVAILABLE_RULES: PricingRule[] = [
  {
    id: 'rule_1',
    name: '会员专享折扣',
    description: '会员购买享受 9 折优惠',
    type: 'DISCOUNT',
  },
  {
    id: 'rule_2',
    name: '周末特价',
    description: '周末购买享受 8.5 折优惠',
    type: 'DISCOUNT',
  },
  {
    id: 'rule_3',
    name: '节假日加价',
    description: '节假日加价 10%',
    type: 'MARKUP',
  },
  {
    id: 'rule_4',
    name: '固定促销价',
    description: '促销期间固定价格 199',
    type: 'FIXED',
  },
];

export default function PricingRulesTab({ data, onChange }: Props) {
  const [showRuleList, setShowRuleList] = useState(false);

  const toggleRule = (ruleId: string) => {
    const currentRules = data.pricingRuleIds || [];
    const newRules = currentRules.includes(ruleId)
      ? currentRules.filter((id) => id !== ruleId)
      : [...currentRules, ruleId];
    onChange({ pricingRuleIds: newRules });
  };

  const removeRule = (ruleId: string) => {
    const newRules = (data.pricingRuleIds || []).filter((id) => id !== ruleId);
    onChange({ pricingRuleIds: newRules });
  };

  const selectedRules = AVAILABLE_RULES.filter((rule) =>
    (data.pricingRuleIds || []).includes(rule.id)
  );

  const availableRules = AVAILABLE_RULES.filter(
    (rule) => !(data.pricingRuleIds || []).includes(rule.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">定价规则</h3>
          <p className="text-sm text-gray-500 mt-1">
            选择应用于此产品的定价规则，如折扣、加价等
          </p>
        </div>
        <button
          onClick={() => setShowRuleList(!showRuleList)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加规则
        </button>
      </div>

      {/* 已选规则列表 */}
      {selectedRules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无定价规则，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">已应用的规则</h4>
          {selectedRules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-lg p-4 flex items-start justify-between hover:border-blue-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-medium text-gray-900">{rule.name}</h5>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      rule.type === 'DISCOUNT'
                        ? 'bg-green-100 text-green-700'
                        : rule.type === 'MARKUP'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {rule.type === 'DISCOUNT'
                      ? '折扣'
                      : rule.type === 'MARKUP'
                      ? '加价'
                      : '固定价'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
              </div>
              <button
                onClick={() => removeRule(rule.id)}
                className="ml-4 text-red-600 hover:text-red-700"
              >
                🗑️ 移除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 可选规则列表（弹出） */}
      {showRuleList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">选择定价规则</h3>
                <button
                  onClick={() => setShowRuleList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {availableRules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">所有规则已添加</p>
              ) : (
                <div className="space-y-3">
                  {availableRules.map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => {
                        toggleRule(rule.id);
                        setShowRuleList(false);
                      }}
                      className="w-full border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{rule.name}</h5>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            rule.type === 'DISCOUNT'
                              ? 'bg-green-100 text-green-700'
                              : rule.type === 'MARKUP'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {rule.type === 'DISCOUNT'
                            ? '折扣'
                            : rule.type === 'MARKUP'
                            ? '加价'
                            : '固定价'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
