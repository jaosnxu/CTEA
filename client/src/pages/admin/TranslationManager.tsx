/**
 * 翻译管理工作台
 * 
 * 实现【系统负责人中心化模式】：
 * - 展示待审核俄语翻译列表
 * - 管理员审核发布功能
 * - 权限隔离：仅管理员可访问
 */

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Globe,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import AITranslationInput from "@/components/admin/AITranslationInput";

// Mock 数据（实际应从 API 获取）
interface Translation {
  id: number;
  key: string;
  category: string;
  textZh: string;
  textRu: string | null;
  textEn: string | null;
  source: "ai_generated" | "manual" | "imported";
  aiConfidence: number | null;
  isPublished: "true" | "false";
  publishedBy: number | null;
  publishedAt: string | null;
  reviewNote: string | null;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mock 待审核翻译数据
const MOCK_PENDING_TRANSLATIONS: Translation[] = [
  {
    id: 1,
    key: "menu.category.milk_tea",
    category: "menu",
    textZh: "奶茶系列",
    textRu: "Серия молочного чая",
    textEn: "Milk Tea Series",
    source: "ai_generated",
    aiConfidence: 92,
    isPublished: "false",
    publishedBy: null,
    publishedAt: null,
    reviewNote: null,
    context: "菜单分类名称",
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
  },
  {
    id: 2,
    key: "menu.category.fruit_tea",
    category: "menu",
    textZh: "水果茶系列",
    textRu: "Серия фруктового чая",
    textEn: "Fruit Tea Series",
    source: "ai_generated",
    aiConfidence: 95,
    isPublished: "false",
    publishedBy: null,
    publishedAt: null,
    reviewNote: null,
    context: "菜单分类名称",
    createdAt: "2026-01-10T10:01:00Z",
    updatedAt: "2026-01-10T10:01:00Z",
  },
  {
    id: 3,
    key: "product.brown_sugar_boba",
    category: "product",
    textZh: "黑糖珍珠鲜奶",
    textRu: "Молоко с тростниковым сахаром и тапиокой",
    textEn: "Brown Sugar Boba Milk",
    source: "ai_generated",
    aiConfidence: 88,
    isPublished: "false",
    publishedBy: null,
    publishedAt: null,
    reviewNote: null,
    context: "产品名称",
    createdAt: "2026-01-10T10:02:00Z",
    updatedAt: "2026-01-10T10:02:00Z",
  },
  {
    id: 4,
    key: "ui.checkout.confirm_order",
    category: "ui",
    textZh: "确认订单",
    textRu: "Подтвердить заказ",
    textEn: "Confirm Order",
    source: "ai_generated",
    aiConfidence: 98,
    isPublished: "false",
    publishedBy: null,
    publishedAt: null,
    reviewNote: null,
    context: "结算页面按钮",
    createdAt: "2026-01-10T10:03:00Z",
    updatedAt: "2026-01-10T10:03:00Z",
  },
  {
    id: 5,
    key: "notification.order_ready",
    category: "notification",
    textZh: "您的订单已准备好，请前往取餐",
    textRu: "Ваш заказ готов, пожалуйста, заберите его",
    textEn: "Your order is ready, please pick it up",
    source: "ai_generated",
    aiConfidence: 91,
    isPublished: "false",
    publishedBy: null,
    publishedAt: null,
    reviewNote: null,
    context: "订单完成通知",
    createdAt: "2026-01-10T10:04:00Z",
    updatedAt: "2026-01-10T10:04:00Z",
  },
];

// Mock 已发布翻译数据
const MOCK_PUBLISHED_TRANSLATIONS: Translation[] = [
  {
    id: 101,
    key: "common.welcome",
    category: "ui",
    textZh: "欢迎光临",
    textRu: "Добро пожаловать",
    textEn: "Welcome",
    source: "manual",
    aiConfidence: null,
    isPublished: "true",
    publishedBy: 1,
    publishedAt: "2026-01-09T15:00:00Z",
    reviewNote: "人工审核通过",
    context: "首页欢迎语",
    createdAt: "2026-01-09T10:00:00Z",
    updatedAt: "2026-01-09T15:00:00Z",
  },
  {
    id: 102,
    key: "common.thank_you",
    category: "ui",
    textZh: "谢谢惠顾",
    textRu: "Спасибо за покупку",
    textEn: "Thank you for your purchase",
    source: "manual",
    aiConfidence: null,
    isPublished: "true",
    publishedBy: 1,
    publishedAt: "2026-01-09T15:01:00Z",
    reviewNote: "人工审核通过",
    context: "订单完成页",
    createdAt: "2026-01-09T10:01:00Z",
    updatedAt: "2026-01-09T15:01:00Z",
  },
];

// 统计数据
const MOCK_STATS = {
  total: 156,
  published: 120,
  pending: 36,
  aiGenerated: 89,
  manual: 67,
};

export default function TranslationManager() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingTranslations, setPendingTranslations] = useState<Translation[]>(MOCK_PENDING_TRANSLATIONS);
  const [publishedTranslations, setPublishedTranslations] = useState<Translation[]>(MOCK_PUBLISHED_TRANSLATIONS);
  const [stats, setStats] = useState(MOCK_STATS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<"unknown" | "available" | "unavailable">("unknown");

  // 获取分类标签颜色
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      menu: "bg-blue-100 text-blue-800",
      product: "bg-green-100 text-green-800",
      ui: "bg-purple-100 text-purple-800",
      notification: "bg-yellow-100 text-yellow-800",
      email: "bg-pink-100 text-pink-800",
      error: "bg-red-100 text-red-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.general;
  };

  // 获取来源图标
  const getSourceIcon = (source: string) => {
    if (source === "ai_generated") {
      return <Bot className="w-4 h-4 text-blue-500" />;
    }
    return <User className="w-4 h-4 text-green-500" />;
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return "text-gray-400";
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  // 发布翻译
  const handlePublish = async (id: number) => {
    setIsLoading(true);
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const translation = pendingTranslations.find(t => t.id === id);
    if (translation) {
      const published = {
        ...translation,
        isPublished: "true" as const,
        publishedBy: 1,
        publishedAt: new Date().toISOString(),
        reviewNote,
      };
      setPendingTranslations(prev => prev.filter(t => t.id !== id));
      setPublishedTranslations(prev => [published, ...prev]);
      setStats(prev => ({
        ...prev,
        published: prev.published + 1,
        pending: prev.pending - 1,
      }));
    }
    
    setIsLoading(false);
    setIsPublishDialogOpen(false);
    setReviewNote("");
    setSelectedTranslation(null);
  };

  // 批量发布
  const handleBatchPublish = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const toPublish = pendingTranslations.filter(t => selectedIds.includes(t.id));
    const published = toPublish.map(t => ({
      ...t,
      isPublished: "true" as const,
      publishedBy: 1,
      publishedAt: new Date().toISOString(),
      reviewNote: "批量审核通过",
    }));
    
    setPendingTranslations(prev => prev.filter(t => !selectedIds.includes(t.id)));
    setPublishedTranslations(prev => [...published, ...prev]);
    setStats(prev => ({
      ...prev,
      published: prev.published + selectedIds.length,
      pending: prev.pending - selectedIds.length,
    }));
    
    setSelectedIds([]);
    setIsLoading(false);
  };

  // 拒绝翻译
  const handleReject = async (id: number) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setPendingTranslations(prev => 
      prev.map(t => t.id === id ? { ...t, reviewNote } : t)
    );
    
    setIsLoading(false);
    setIsRejectDialogOpen(false);
    setReviewNote("");
    setSelectedTranslation(null);
  };

  // 切换选中状态
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === pendingTranslations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingTranslations.map(t => t.id));
    }
  };

  // 过滤翻译
  const filteredPending = pendingTranslations.filter(t => 
    t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.textZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.textRu && t.textRu.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPublished = publishedTranslations.filter(t => 
    t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.textZh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.textRu && t.textRu.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Управление переводами
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Централизованная система управления переводами
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Всего</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <div className="text-xs text-gray-500">Опубликовано</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">На проверке</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.aiGenerated}</div>
            <div className="text-xs text-gray-500">AI перевод</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.manual}</div>
            <div className="text-xs text-gray-500">Ручной</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск по ключу или тексту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => setIsAIInputOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI 翻译录入
        </Button>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            На проверке
            <Badge variant="secondary" className="ml-1">{filteredPending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Опубликовано
            <Badge variant="secondary" className="ml-1">{filteredPublished.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* 待审核列表 */}
        <TabsContent value="pending">
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Выбрано: {selectedIds.length} элементов
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchPublish}
                disabled={isLoading}
              >
                Опубликовать выбранные
              </Button>
            </div>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pendingTranslations.length && pendingTranslations.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Ключ</TableHead>
                  <TableHead>Китайский</TableHead>
                  <TableHead>Русский</TableHead>
                  <TableHead className="w-20">Источник</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((translation) => (
                  <TableRow key={translation.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(translation.id)}
                        onChange={() => toggleSelect(translation.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <code className="text-xs bg-gray-100 px-1 rounded">{translation.key}</code>
                        <Badge className={`text-[10px] w-fit ${getCategoryColor(translation.category)}`}>
                          {translation.category}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">
                      {translation.textZh}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {translation.textRu || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(translation.source)}
                        {translation.aiConfidence !== null && (
                          <span className={`text-xs ${getConfidenceColor(translation.aiConfidence)}`}>
                            {translation.aiConfidence}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedTranslation(translation);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            setSelectedTranslation(translation);
                            setIsPublishDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedTranslation(translation);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Нет переводов на проверке
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* 已发布列表 */}
        <TabsContent value="published">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ключ</TableHead>
                  <TableHead>Китайский</TableHead>
                  <TableHead>Русский</TableHead>
                  <TableHead className="w-20">Источник</TableHead>
                  <TableHead className="w-32">Опубликовано</TableHead>
                  <TableHead className="w-20">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublished.map((translation) => (
                  <TableRow key={translation.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <code className="text-xs bg-gray-100 px-1 rounded">{translation.key}</code>
                        <Badge className={`text-[10px] w-fit ${getCategoryColor(translation.category)}`}>
                          {translation.category}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">
                      {translation.textZh}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {translation.textRu || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(translation.source)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {translation.publishedAt 
                        ? new Date(translation.publishedAt).toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedTranslation(translation);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPublished.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Нет опубликованных переводов
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 详情弹窗 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали перевода</DialogTitle>
          </DialogHeader>
          {selectedTranslation && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Ключ</label>
                <code className="block bg-gray-100 p-2 rounded text-sm">
                  {selectedTranslation.key}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Категория</label>
                  <Badge className={getCategoryColor(selectedTranslation.category)}>
                    {selectedTranslation.category}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Источник</label>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(selectedTranslation.source)}
                    <span className="text-sm">
                      {selectedTranslation.source === "ai_generated" ? "AI" : "Ручной"}
                    </span>
                    {selectedTranslation.aiConfidence !== null && (
                      <span className={`text-sm ${getConfidenceColor(selectedTranslation.aiConfidence)}`}>
                        ({selectedTranslation.aiConfidence}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Китайский (原文)</label>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedTranslation.textZh}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Русский</label>
                <div className="bg-blue-50 p-3 rounded text-sm">
                  {selectedTranslation.textRu || <span className="text-gray-400">Не переведено</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">English</label>
                <div className="bg-green-50 p-3 rounded text-sm">
                  {selectedTranslation.textEn || <span className="text-gray-400">Not translated</span>}
                </div>
              </div>
              {selectedTranslation.context && (
                <div>
                  <label className="text-xs text-gray-500">Контекст</label>
                  <div className="text-sm text-gray-600">
                    {selectedTranslation.context}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 发布确认弹窗 */}
      <AlertDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Опубликовать перевод?
            </AlertDialogTitle>
            <AlertDialogDescription>
              После публикации перевод станет доступен для всех пользователей приложения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedTranslation && (
            <div className="my-4 space-y-2">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500 mb-1">Ключ</div>
                <code className="text-sm">{selectedTranslation.key}</code>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-xs text-gray-500 mb-1">Русский перевод</div>
                <div className="text-sm">{selectedTranslation.textRu}</div>
              </div>
              <Textarea
                placeholder="Примечание к проверке (необязательно)"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="mt-2"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTranslation && handlePublish(selectedTranslation.id)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Публикация..." : "Опубликовать"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 拒绝确认弹窗 */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Отклонить перевод?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Пожалуйста, укажите причину отклонения перевода.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedTranslation && (
            <div className="my-4 space-y-2">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500 mb-1">Русский перевод</div>
                <div className="text-sm">{selectedTranslation.textRu}</div>
              </div>
              <Textarea
                placeholder="Причина отклонения (обязательно)"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="mt-2"
                required
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTranslation && handleReject(selectedTranslation.id)}
              disabled={isLoading || !reviewNote.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Отклонение..." : "Отклонить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 权限提示 */}
      <div className="fixed bottom-20 left-0 right-0 bg-yellow-50 border-t border-yellow-200 p-3">
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          <span>Только администраторы могут управлять переводами</span>
        </div>
      </div>

      {/* AI 翻译录入弹窗 */}
      <AITranslationInput
        open={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
        onSuccess={() => {
          // 刷新待审核列表
          // TODO: 实际应调用 API 刷新数据
        }}
      />
    </div>
  );
}
