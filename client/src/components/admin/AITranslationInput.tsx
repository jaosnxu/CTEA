/**
 * AI 翻译录入组件
 * 
 * 集成 DeepSeek AI 翻译引擎：
 * - 输入中文原文，自动翻译为俄语/英语
 * - 显示翻译置信度
 * - 支持人工修改翻译结果
 * - 保存到数据库（默认待审核状态）
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bot, 
  Sparkles, 
  RefreshCw, 
  Save, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Languages,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// 翻译分类选项
const CATEGORIES = [
  { value: "menu", label: "Меню", labelZh: "菜单" },
  { value: "product", label: "Продукт", labelZh: "产品" },
  { value: "ui", label: "Интерфейс", labelZh: "界面" },
  { value: "notification", label: "Уведомление", labelZh: "通知" },
  { value: "email", label: "Email", labelZh: "邮件" },
  { value: "error", label: "Ошибка", labelZh: "错误" },
  { value: "general", label: "Общее", labelZh: "通用" },
];

interface AITranslationInputProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AITranslationInput({ open, onClose, onSuccess }: AITranslationInputProps) {
  // 表单状态
  const [key, setKey] = useState("");
  const [category, setCategory] = useState("general");
  const [textZh, setTextZh] = useState("");
  const [context, setContext] = useState("");
  
  // 翻译结果状态
  const [textRu, setTextRu] = useState("");
  const [textEn, setTextEn] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  
  // 加载状态
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [aiStatus, setAiStatus] = useState<"unknown" | "available" | "unavailable">("unknown");

  // 检查 AI 状态
  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/trpc/translation.checkAIStatus', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAiStatus(data.result?.data?.available ? "available" : "unavailable");
      }
    } catch {
      setAiStatus("unavailable");
    }
  };

  // 调用 AI 翻译
  const handleTranslate = async () => {
    if (!textZh.trim()) {
      toast.error("请输入中文原文");
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/trpc/translation.aiTranslate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            textZh: textZh.trim(),
            context: context.trim() || undefined,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('翻译请求失败');
      }

      const data = await response.json();
      const result = data.result?.data;

      if (result?.success) {
        setTextRu(result.textRu || "");
        setTextEn(result.textEn || "");
        setConfidence(result.confidence || null);
        setIsTranslated(true);
        toast.success("AI 翻译完成", {
          description: `置信度: ${result.confidence}%`,
        });
      } else {
        throw new Error(result?.error || '翻译失败');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error("翻译失败", {
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // 保存翻译
  const handleSave = async () => {
    if (!key.trim()) {
      toast.error("请输入翻译键");
      return;
    }
    if (!textZh.trim()) {
      toast.error("请输入中文原文");
      return;
    }
    if (!textRu.trim()) {
      toast.error("请先进行 AI 翻译或手动输入俄语翻译");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/trpc/translation.createWithAI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            key: key.trim(),
            category,
            textZh: textZh.trim(),
            context: context.trim() || undefined,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('保存请求失败');
      }

      const data = await response.json();
      const result = data.result?.data;

      if (result?.success) {
        toast.success("翻译已保存", {
          description: "已添加到待审核列表",
        });
        // 重置表单
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setKey("");
    setCategory("general");
    setTextZh("");
    setContext("");
    setTextRu("");
    setTextEn("");
    setConfidence(null);
    setIsTranslated(false);
  };

  // 获取置信度颜色
  const getConfidenceColor = (conf: number | null) => {
    if (conf === null) return "bg-gray-100 text-gray-600";
    if (conf >= 90) return "bg-green-100 text-green-700";
    if (conf >= 70) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            AI 翻译录入
          </DialogTitle>
          <DialogDescription>
            输入中文原文，DeepSeek AI 将自动翻译为俄语和英语
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 翻译键和分类 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">翻译键 (Key)</Label>
              <Input
                id="key"
                placeholder="例如: menu.category.drinks"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label} ({cat.labelZh})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 中文原文 */}
          <div className="space-y-2">
            <Label htmlFor="textZh">中文原文</Label>
            <Textarea
              id="textZh"
              placeholder="输入需要翻译的中文文本..."
              value={textZh}
              onChange={(e) => {
                setTextZh(e.target.value);
                setIsTranslated(false);
              }}
              rows={3}
            />
          </div>

          {/* 上下文说明 */}
          <div className="space-y-2">
            <Label htmlFor="context">上下文说明 (可选)</Label>
            <Input
              id="context"
              placeholder="例如: 菜单分类名称、按钮文本、通知消息..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              提供上下文可以帮助 AI 生成更准确的翻译
            </p>
          </div>

          {/* AI 翻译按钮 */}
          <div className="flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !textZh.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 翻译中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  DeepSeek AI 翻译
                </>
              )}
            </Button>
          </div>

          {/* 翻译结果 */}
          {(isTranslated || textRu || textEn) && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    翻译结果
                  </CardTitle>
                  {confidence !== null && (
                    <Badge className={getConfidenceColor(confidence)}>
                      置信度: {confidence}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 俄语翻译 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    🇷🇺 俄语 (Русский)
                    {isTranslated && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </Label>
                  <Textarea
                    value={textRu}
                    onChange={(e) => setTextRu(e.target.value)}
                    placeholder="俄语翻译..."
                    rows={2}
                    className="bg-white"
                  />
                </div>

                {/* 英语翻译 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    🇬🇧 英语 (English)
                    {isTranslated && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </Label>
                  <Textarea
                    value={textEn}
                    onChange={(e) => setTextEn(e.target.value)}
                    placeholder="英语翻译..."
                    rows={2}
                    className="bg-white"
                  />
                </div>

                {/* 重新翻译按钮 */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isTranslating ? 'animate-spin' : ''}`} />
                    重新翻译
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示信息 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">注意</p>
                <p className="text-xs mt-1">
                  AI 翻译结果将保存为"待审核"状态，需要管理员审核后才会发布到前端。
                  您可以在保存前手动修改翻译结果。
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !key.trim() || !textZh.trim() || !textRu.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存到待审核
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
