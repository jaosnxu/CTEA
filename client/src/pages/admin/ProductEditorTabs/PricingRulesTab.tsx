import React, { useState, useEffect } from 'react';
import { ProductFormData } from '../../../types/product-editor.types';

interface Props {
  data: ProductFormData;
  onChange: (updates: Partial<ProductFormData>) => void;
}

interface PricingRule {
  id: string;
  name: { zh?: string; ru?: string; en?: string } | string;
  description: { zh?: string; ru?: string; en?: string } | string;
  condition: any;
  action: {
    type: 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'MARKUP_PERCENT' | 'SET_PRICE';
    value: number;
  };
  priority: number;
  isActive: boolean;
}

export default function PricingRulesTab({ data, onChange }: Props) {
  const [showRuleList, setShowRuleList] = useState(false);
  const [availableRules, setAvailableRules] = useState<PricingRule[]>([]);
  const [selectedRules, setSelectedRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available pricing rules
  useEffect(() => {
    loadAvailableRules();
  }, []);

  // Load selected rules when pricingRuleIds change
  useEffect(() => {
    if (data.pricingRuleIds && data.pricingRuleIds.length > 0) {
      loadSelectedRules();
    } else {
      setSelectedRules([]);
    }
  }, [data.pricingRuleIds]);

  const loadAvailableRules = async () => {
    try {
      const response = await fetch('/api/admin/pricing-rules?isActive=true');
      const result = await response.json();
      if (result.success) {
        setAvailableRules(result.data);
      }
    } catch (error) {
      console.error('Failed to load pricing rules:', error);
    }
  };

  const loadSelectedRules = async () => {
    try {
      setLoading(true);
      const ruleIds = data.pricingRuleIds || [];
      const rules: PricingRule[] = [];
      
      for (const ruleId of ruleIds) {
        const response = await fetch(`/api/admin/pricing-rules/${ruleId}`);
        const result = await response.json();
        if (result.success) {
          rules.push(result.data);
        }
      }
      
      setSelectedRules(rules);
    } catch (error) {
      console.error('Failed to load selected rules:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getName = (rule: PricingRule): string => {
    if (typeof rule.name === 'string') return rule.name;
    return rule.name.ru || rule.name.zh || rule.name.en || '';
  };

  const getDescription = (rule: PricingRule): string => {
    if (typeof rule.description === 'string') return rule.description;
    return rule.description?.ru || rule.description?.zh || rule.description?.en || '';
  };

  const getActionLabel = (action: PricingRule['action']): string => {
    const labels = {
      DISCOUNT_PERCENT: `折扣 ${action.value}%`,
      DISCOUNT_FIXED: `减免 ${action.value}₽`,
      MARKUP_PERCENT: `加价 ${action.value}%`,
      SET_PRICE: `固定价 ${action.value}₽`,
    };
    return labels[action.type] || action.type;
  };

  const filteredAvailableRules = availableRules.filter(
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
          onClick={() => {
            loadAvailableRules();
            setShowRuleList(!showRuleList);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加规则
        </button>
      </div>

      {/* 已选规则列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : selectedRules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">暂无定价规则，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">已应用的规则 ({selectedRules.length})</h4>
          {selectedRules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-lg p-4 flex items-start justify-between hover:border-blue-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-medium text-gray-900">{getName(rule)}</h5>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                    优先级: {rule.priority}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                    {getActionLabel(rule.action)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{getDescription(rule)}</p>
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
              {filteredAvailableRules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">所有规则已添加</p>
              ) : (
                <div className="space-y-3">
                  {filteredAvailableRules.map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => {
                        toggleRule(rule.id);
                        setShowRuleList(false);
                      }}
                      className="w-full border border-gray-200 rounded-lg p-4 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{getName(rule)}</h5>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          优先级: {rule.priority}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                          {getActionLabel(rule.action)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{getDescription(rule)}</p>
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
