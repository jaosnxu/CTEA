/**
 * 可视化布局编辑器组件
 * 支持拖拽排序和属性编辑
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import type { PageLayoutConfig, LayoutComponent } from "@shared/types/layout";
import { ComponentPropsEditor } from "./ComponentPropsEditor";

interface LayoutVisualEditorProps {
  config: PageLayoutConfig;
  onChange: (config: PageLayoutConfig) => void;
  language: "zh" | "ru" | "en";
}

const componentTypeNames = {
  banner: { zh: "横幅", ru: "Баннер", en: "Banner" },
  "product-block": { zh: "商品区块", ru: "Блок товаров", en: "Product Block" },
  "category-nav": { zh: "分类导航", ru: "Навигация категорий", en: "Category Nav" },
  "text-block": { zh: "文字块", ru: "Текстовый блок", en: "Text Block" },
  "image-block": { zh: "图片块", ru: "Блок изображения", en: "Image Block" },
  divider: { zh: "分隔线", ru: "Разделитель", en: "Divider" },
  spacer: { zh: "间隔器", ru: "Спейсер", en: "Spacer" },
};

export function LayoutVisualEditor({
  config,
  onChange,
  language,
}: LayoutVisualEditorProps) {
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddComponent = (type: LayoutComponent["type"]) => {
    const newId = `${type}-${Date.now()}`;
    const newComponent: LayoutComponent = {
      id: newId,
      type,
      props: getDefaultProps(type),
      visible: true,
      order: config.blocks.length + 1,
    };

    onChange({
      ...config,
      blocks: [...config.blocks, newComponent],
    });
    setShowAddMenu(false);
  };

  const handleRemoveComponent = (id: string) => {
    onChange({
      ...config,
      blocks: config.blocks.filter(b => b.id !== id),
    });
  };

  const handleToggleVisibility = (id: string) => {
    onChange({
      ...config,
      blocks: config.blocks.map(b =>
        b.id === id ? { ...b, visible: !b.visible } : b
      ),
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...config.blocks];
    [newBlocks[index - 1], newBlocks[index]] = [
      newBlocks[index],
      newBlocks[index - 1],
    ];
    onChange({ ...config, blocks: newBlocks });
  };

  const handleMoveDown = (index: number) => {
    if (index === config.blocks.length - 1) return;
    const newBlocks = [...config.blocks];
    [newBlocks[index], newBlocks[index + 1]] = [
      newBlocks[index + 1],
      newBlocks[index],
    ];
    onChange({ ...config, blocks: newBlocks });
  };

  const handleUpdateComponent = (
    id: string,
    updatedComponent: LayoutComponent
  ) => {
    onChange({
      ...config,
      blocks: config.blocks.map(b => (b.id === id ? updatedComponent : b)),
    });
    setEditingComponent(null);
  };

  return (
    <div className="space-y-4">
      {/* Component List */}
      <div className="space-y-2">
        {config.blocks.map((block, index) => (
          <Card
            key={block.id}
            className={`p-4 ${!block.visible ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === config.blocks.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <div className="font-medium">
                    {componentTypeNames[block.type][language]}
                  </div>
                  <div className="text-sm text-muted-foreground">{block.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleVisibility(block.id)}
                >
                  {block.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingComponent(block.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveComponent(block.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Component Button */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {language === "zh" && "添加组件"}
          {language === "ru" && "Добавить компонент"}
          {language === "en" && "Add Component"}
        </Button>

        {showAddMenu && (
          <Card className="absolute top-full mt-2 w-full z-10 p-2">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(componentTypeNames).map(([type, names]) => (
                <Button
                  key={type}
                  variant="ghost"
                  className="justify-start"
                  onClick={() =>
                    handleAddComponent(type as LayoutComponent["type"])
                  }
                >
                  {names[language]}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Component Props Editor */}
      {editingComponent && (
        <ComponentPropsEditor
          component={
            config.blocks.find(b => b.id === editingComponent)!
          }
          language={language}
          onSave={updatedComponent =>
            handleUpdateComponent(editingComponent, updatedComponent)
          }
          onCancel={() => setEditingComponent(null)}
        />
      )}
    </div>
  );
}

// Helper function to get default props for each component type
function getDefaultProps(type: LayoutComponent["type"]): any {
  switch (type) {
    case "banner":
      return {
        images: [],
        autoPlay: true,
        interval: 5000,
        height: 200,
      };
    case "product-block":
      return {
        title: { zh: "商品", ru: "Товары", en: "Products" },
        layout: "grid",
        showPrice: true,
        showAddToCart: true,
      };
    case "category-nav":
      return {
        categories: [],
        layout: "grid",
        columns: 4,
      };
    case "text-block":
      return {
        content: { zh: "文本", ru: "Текст", en: "Text" },
        align: "left",
        fontSize: "base",
      };
    case "image-block":
      return {
        url: "",
        aspectRatio: "16:9",
        objectFit: "cover",
      };
    case "divider":
      return {
        thickness: 1,
        color: "#e5e7eb",
        margin: 16,
      };
    case "spacer":
      return {
        height: 20,
      };
    default:
      return {};
  }
}
