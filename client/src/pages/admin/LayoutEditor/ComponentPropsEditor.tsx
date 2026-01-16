/**
 * 组件属性编辑器
 * 根据组件类型显示相应的属性编辑表单
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LayoutComponent } from "@shared/types/layout";

interface ComponentPropsEditorProps {
  component: LayoutComponent;
  language: "zh" | "ru" | "en";
  onSave: (component: LayoutComponent) => void;
  onCancel: () => void;
}

export function ComponentPropsEditor({
  component,
  language,
  onSave,
  onCancel,
}: ComponentPropsEditorProps) {
  const [editedComponent, setEditedComponent] = useState<LayoutComponent>(
    JSON.parse(JSON.stringify(component))
  );

  const updateProp = (key: string, value: any) => {
    setEditedComponent({
      ...editedComponent,
      props: {
        ...editedComponent.props,
        [key]: value,
      },
    });
  };

  const updateI18nProp = (key: string, lang: "zh" | "ru" | "en", value: string) => {
    const currentValue = (editedComponent.props as any)[key] || {};
    updateProp(key, {
      ...currentValue,
      [lang]: value,
    });
  };

  const renderPropsEditor = () => {
    const { type, props } = editedComponent;

    switch (type) {
      case "banner":
        return (
          <div className="space-y-4">
            <div>
              <Label>
                {language === "zh" && "高度 (像素)"}
                {language === "ru" && "Высота (пиксели)"}
                {language === "en" && "Height (pixels)"}
              </Label>
              <Input
                type="number"
                value={(props as any).height || 200}
                onChange={e => updateProp("height", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "自动播放间隔 (毫秒)"}
                {language === "ru" && "Интервал автовоспроизведения (мс)"}
                {language === "en" && "Autoplay Interval (ms)"}
              </Label>
              <Input
                type="number"
                value={(props as any).interval || 5000}
                onChange={e => updateProp("interval", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "product-block":
        return (
          <div className="space-y-4">
            <div>
              <Label>
                {language === "zh" && "标题 (中文)"}
                {language === "ru" && "Заголовок (китайский)"}
                {language === "en" && "Title (Chinese)"}
              </Label>
              <Input
                value={((props as any).title?.zh || "")}
                onChange={e => updateI18nProp("title", "zh", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "标题 (俄语)"}
                {language === "ru" && "Заголовок (русский)"}
                {language === "en" && "Title (Russian)"}
              </Label>
              <Input
                value={((props as any).title?.ru || "")}
                onChange={e => updateI18nProp("title", "ru", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "标题 (英语)"}
                {language === "ru" && "Заголовок (английский)"}
                {language === "en" && "Title (English)"}
              </Label>
              <Input
                value={((props as any).title?.en || "")}
                onChange={e => updateI18nProp("title", "en", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "布局方式"}
                {language === "ru" && "Макет"}
                {language === "en" && "Layout"}
              </Label>
              <Select
                value={(props as any).layout || "grid"}
                onValueChange={v => updateProp("layout", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {language === "zh" && "显示数量"}
                {language === "ru" && "Количество отображения"}
                {language === "en" && "Limit"}
              </Label>
              <Input
                type="number"
                value={(props as any).limit || 8}
                onChange={e => updateProp("limit", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "text-block":
        return (
          <div className="space-y-4">
            <div>
              <Label>
                {language === "zh" && "内容 (中文)"}
                {language === "ru" && "Содержание (китайский)"}
                {language === "en" && "Content (Chinese)"}
              </Label>
              <Textarea
                value={((props as any).content?.zh || "")}
                onChange={e => updateI18nProp("content", "zh", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "内容 (俄语)"}
                {language === "ru" && "Содержание (русский)"}
                {language === "en" && "Content (Russian)"}
              </Label>
              <Textarea
                value={((props as any).content?.ru || "")}
                onChange={e => updateI18nProp("content", "ru", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "内容 (英语)"}
                {language === "ru" && "Содержание (английский)"}
                {language === "en" && "Content (English)"}
              </Label>
              <Textarea
                value={((props as any).content?.en || "")}
                onChange={e => updateI18nProp("content", "en", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "对齐方式"}
                {language === "ru" && "Выравнивание"}
                {language === "en" && "Alignment"}
              </Label>
              <Select
                value={(props as any).align || "left"}
                onValueChange={v => updateProp("align", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {language === "zh" && "字体大小"}
                {language === "ru" && "Размер шрифта"}
                {language === "en" && "Font Size"}
              </Label>
              <Select
                value={(props as any).fontSize || "base"}
                onValueChange={v => updateProp("fontSize", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "spacer":
        return (
          <div className="space-y-4">
            <div>
              <Label>
                {language === "zh" && "高度 (像素)"}
                {language === "ru" && "Высота (пиксели)"}
                {language === "en" && "Height (pixels)"}
              </Label>
              <Input
                type="number"
                value={(props as any).height || 20}
                onChange={e => updateProp("height", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "divider":
        return (
          <div className="space-y-4">
            <div>
              <Label>
                {language === "zh" && "厚度 (像素)"}
                {language === "ru" && "Толщина (пиксели)"}
                {language === "en" && "Thickness (pixels)"}
              </Label>
              <Input
                type="number"
                value={(props as any).thickness || 1}
                onChange={e => updateProp("thickness", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "颜色"}
                {language === "ru" && "Цвет"}
                {language === "en" && "Color"}
              </Label>
              <Input
                type="color"
                value={(props as any).color || "#e5e7eb"}
                onChange={e => updateProp("color", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {language === "zh" && "边距 (像素)"}
                {language === "ru" && "Отступ (пиксели)"}
                {language === "en" && "Margin (pixels)"}
              </Label>
              <Input
                type="number"
                value={(props as any).margin || 16}
                onChange={e => updateProp("margin", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground py-4">
            {language === "zh" && "此组件暂无可编辑属性"}
            {language === "ru" && "Нет редактируемых свойств для этого компонента"}
            {language === "en" && "No editable properties for this component"}
          </div>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === "zh" && "编辑组件属性"}
            {language === "ru" && "Редактировать свойства компонента"}
            {language === "en" && "Edit Component Properties"}
          </DialogTitle>
          <DialogDescription>{editedComponent.id}</DialogDescription>
        </DialogHeader>

        {renderPropsEditor()}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {language === "zh" && "取消"}
            {language === "ru" && "Отмена"}
            {language === "en" && "Cancel"}
          </Button>
          <Button onClick={() => onSave(editedComponent)}>
            {language === "zh" && "保存"}
            {language === "ru" && "Сохранить"}
            {language === "en" && "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
