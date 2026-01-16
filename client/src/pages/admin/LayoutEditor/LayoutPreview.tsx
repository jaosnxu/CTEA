/**
 * 布局预览组件
 * 实时预览布局配置效果
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PageLayoutConfig, LayoutComponent } from "@shared/types/layout";

interface LayoutPreviewProps {
  config: PageLayoutConfig;
  language: "zh" | "ru" | "en";
}

export function LayoutPreview({ config, language }: LayoutPreviewProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>
          {language === "zh" && "预览"}
          {language === "ru" && "Предпросмотр"}
          {language === "en" && "Preview"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="max-h-[700px] overflow-y-auto p-4 space-y-4">
            {config.blocks
              .filter(b => b.visible !== false)
              .map(block => (
                <ComponentPreview
                  key={block.id}
                  component={block}
                  language={language}
                />
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentPreview({
  component,
  language,
}: {
  component: LayoutComponent;
  language: "zh" | "ru" | "en";
}) {
  const { type, props } = component;

  switch (type) {
    case "banner":
      return (
        <div
          className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center"
          style={{ height: (props as any).height || 200 }}
        >
          <span className="text-sm text-muted-foreground">
            {language === "zh" && "横幅"}
            {language === "ru" && "Баннер"}
            {language === "en" && "Banner"}
          </span>
        </div>
      );

    case "product-block":
      const title = (props as any).title;
      return (
        <div className="space-y-2">
          {title && (
            <h3 className="font-semibold">
              {title[language] || title.ru || "Products"}
            </h3>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">
                  {language === "zh" && "商品"}
                  {language === "ru" && "Товар"}
                  {language === "en" && "Product"} {i}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "category-nav":
      const categories = (props as any).categories || [];
      return (
        <div className="grid grid-cols-4 gap-2">
          {categories.length > 0 ? (
            categories.map((cat: any, i: number) => (
              <div
                key={i}
                className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg">{cat.icon || "📁"}</span>
                <span className="text-xs text-center">
                  {cat.name[language] || cat.name.ru || "Category"}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-sm text-muted-foreground py-4">
              {language === "zh" && "暂无分类"}
              {language === "ru" && "Нет категорий"}
              {language === "en" && "No categories"}
            </div>
          )}
        </div>
      );

    case "text-block":
      const content = (props as any).content;
      const align = (props as any).align || "left";
      const fontSize = (props as any).fontSize || "base";
      return (
        <div
          className={`text-${align} text-${fontSize}`}
          style={{
            padding: (props as any).padding || 0,
            color: (props as any).color,
            backgroundColor: (props as any).backgroundColor,
          }}
        >
          {content?.[language] || content?.ru || "Text"}
        </div>
      );

    case "image-block":
      return (
        <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
          <span className="text-sm text-muted-foreground">
            {language === "zh" && "图片"}
            {language === "ru" && "Изображение"}
            {language === "en" && "Image"}
          </span>
        </div>
      );

    case "divider":
      return (
        <div
          style={{
            height: (props as any).thickness || 1,
            backgroundColor: (props as any).color || "#e5e7eb",
            margin: `${(props as any).margin || 16}px 0`,
          }}
        />
      );

    case "spacer":
      return <div style={{ height: (props as any).height || 20 }} />;

    default:
      return (
        <div className="bg-muted rounded p-4 text-center text-sm text-muted-foreground">
          Unknown component: {type}
        </div>
      );
  }
}
