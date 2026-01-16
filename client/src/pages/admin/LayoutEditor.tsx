/**
 * 布局编辑器页面
 * 可视化拖拽编辑器 + JSON 编辑模式
 */

import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Eye, Code, History, RotateCcw } from "lucide-react";
import type { PageLayoutConfig, PageType } from "@shared/types/layout";
import { LayoutVisualEditor } from "./LayoutEditor/LayoutVisualEditor";
import { LayoutJsonEditor } from "./LayoutEditor/LayoutJsonEditor";
import { LayoutPreview } from "./LayoutEditor/LayoutPreview";
import { LayoutHistory } from "./LayoutEditor/LayoutHistory";

const pageNames = {
  home: {
    zh: "首页",
    ru: "Главная",
    en: "Home",
  },
  order: {
    zh: "下单页",
    ru: "Страница заказа",
    en: "Order Page",
  },
  mall: {
    zh: "商城页",
    ru: "Страница магазина",
    en: "Mall Page",
  },
};

export default function LayoutEditor() {
  const [, params] = useRoute("/admin/layouts/edit/:page");
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<"zh" | "ru" | "en">("ru");
  const [editMode, setEditMode] = useState<"visual" | "json">("visual");
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<PageLayoutConfig | null>(
    null
  );
  const [hasChanges, setHasChanges] = useState(false);

  const page = params?.page as PageType;

  // 获取布局配置
  const layoutQuery = trpc.layout.get.useQuery({ page }, { enabled: !!page });

  // 保存布局配置
  const saveMutation = trpc.layout.save.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh"
          ? "保存成功"
          : language === "ru"
            ? "Успешно сохранено"
            : "Saved successfully"
      );
      setHasChanges(false);
      layoutQuery.refetch();
    },
    onError: error => {
      toast.error(
        language === "zh"
          ? `保存失败: ${error.message}`
          : language === "ru"
            ? `Ошибка сохранения: ${error.message}`
            : `Save failed: ${error.message}`
      );
    },
  });

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "zh" | "ru" | "en";
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (layoutQuery.data?.layout) {
      setLayoutConfig(layoutQuery.data.layout.config as PageLayoutConfig);
    }
  }, [layoutQuery.data]);

  if (!page || !["home", "order", "mall"].includes(page)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Page</h2>
          <Button onClick={() => setLocation("/admin/layouts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Layouts
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!layoutConfig) return;

    saveMutation.mutate({
      page,
      config: layoutConfig,
    });
  };

  const handleConfigChange = (newConfig: PageLayoutConfig) => {
    setLayoutConfig(newConfig);
    setHasChanges(true);
  };

  const handleRestore = (version: number) => {
    // Will be implemented in LayoutHistory component
    setShowHistory(false);
    layoutQuery.refetch();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/layouts")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === "zh" && "返回"}
            {language === "ru" && "Назад"}
            {language === "en" && "Back"}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {language === "zh" && "编辑布局 - "}
              {language === "ru" && "Редактировать макет - "}
              {language === "en" && "Edit Layout - "}
              {pageNames[page][language]}
            </h1>
            {layoutQuery.data?.layout && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  v{layoutQuery.data.layout.version}
                </Badge>
                {hasChanges && (
                  <Badge variant="secondary">
                    {language === "zh" && "有未保存的更改"}
                    {language === "ru" && "Несохраненные изменения"}
                    {language === "en" && "Unsaved changes"}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
          >
            <History className="mr-2 h-4 w-4" />
            {language === "zh" && "历史"}
            {language === "ru" && "История"}
            {language === "en" && "History"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {language === "zh" && "预览"}
            {language === "ru" && "Предпросмотр"}
            {language === "en" && "Preview"}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending
              ? language === "zh"
                ? "保存中..."
                : language === "ru"
                  ? "Сохранение..."
                  : "Saving..."
              : language === "zh"
                ? "保存"
                : language === "ru"
                  ? "Сохранить"
                  : "Save"}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {layoutQuery.isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Editor */}
      {layoutConfig && !layoutQuery.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Area */}
          <div className={showPreview ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {language === "zh" && "布局编辑器"}
                      {language === "ru" && "Редактор макета"}
                      {language === "en" && "Layout Editor"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh" && "拖拽组件或编辑 JSON"}
                      {language === "ru" &&
                        "Перетаскивайте компоненты или редактируйте JSON"}
                      {language === "en" && "Drag components or edit JSON"}
                    </CardDescription>
                  </div>
                  <Tabs
                    value={editMode}
                    onValueChange={v => setEditMode(v as "visual" | "json")}
                  >
                    <TabsList>
                      <TabsTrigger value="visual">
                        <Eye className="h-4 w-4 mr-1" />
                        {language === "zh" && "可视化"}
                        {language === "ru" && "Визуальный"}
                        {language === "en" && "Visual"}
                      </TabsTrigger>
                      <TabsTrigger value="json">
                        <Code className="h-4 w-4 mr-1" />
                        JSON
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {editMode === "visual" ? (
                  <LayoutVisualEditor
                    config={layoutConfig}
                    onChange={handleConfigChange}
                    language={language}
                  />
                ) : (
                  <LayoutJsonEditor
                    config={layoutConfig}
                    onChange={handleConfigChange}
                    language={language}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="lg:col-span-1">
              <LayoutPreview config={layoutConfig} language={language} />
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <LayoutHistory
          page={page}
          language={language}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}
