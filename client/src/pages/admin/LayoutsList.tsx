/**
 * 布局配置列表页面
 * 显示所有页面的布局配置状态
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileEdit, Home, ShoppingCart, Store } from "lucide-react";
import { format } from "date-fns";

interface LayoutInfo {
  id: number;
  page: string;
  version: number;
  updatedAt: Date;
  createdBy: string | null;
}

const pageIcons = {
  home: Home,
  order: ShoppingCart,
  mall: Store,
};

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

export default function LayoutsList() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<"zh" | "ru" | "en">("ru");

  // 获取布局列表
  const layoutsQuery = trpc.layout.list.useQuery();

  useEffect(() => {
    // 从localStorage或其他地方获取语言设置
    const savedLang = localStorage.getItem("language") as "zh" | "ru" | "en";
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const layouts = layoutsQuery.data?.layouts || [];

  // 确保所有页面都显示
  const allPages = ["home", "order", "mall"];
  const layoutMap = new Map(layouts.map(l => [l.page, l]));
  
  const displayLayouts: (LayoutInfo | { page: string; isDefault: boolean })[] = allPages.map(page => {
    const layout = layoutMap.get(page);
    if (layout) {
      return layout;
    }
    return { page, isDefault: true };
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {language === "zh" && "布局配置管理"}
          {language === "ru" && "Управление макетами"}
          {language === "en" && "Layout Management"}
        </h1>
        <p className="text-muted-foreground">
          {language === "zh" && "管理首页、下单页、商城页的动态布局配置"}
          {language === "ru" &&
            "Управление динамической конфигурацией макетов для главной страницы, страницы заказа и магазина"}
          {language === "en" &&
            "Manage dynamic layout configurations for home, order, and mall pages"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "zh" && "页面布局"}
            {language === "ru" && "Макеты страниц"}
            {language === "en" && "Page Layouts"}
          </CardTitle>
          <CardDescription>
            {language === "zh" && "点击编辑按钮进入可视化编辑器"}
            {language === "ru" &&
              "Нажмите кнопку редактирования, чтобы открыть визуальный редактор"}
            {language === "en" &&
              "Click the edit button to open the visual editor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {layoutsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {language === "zh" && "页面"}
                    {language === "ru" && "Страница"}
                    {language === "en" && "Page"}
                  </TableHead>
                  <TableHead>
                    {language === "zh" && "状态"}
                    {language === "ru" && "Статус"}
                    {language === "en" && "Status"}
                  </TableHead>
                  <TableHead>
                    {language === "zh" && "版本"}
                    {language === "ru" && "Версия"}
                    {language === "en" && "Version"}
                  </TableHead>
                  <TableHead>
                    {language === "zh" && "最后修改"}
                    {language === "ru" && "Последнее изменение"}
                    {language === "en" && "Last Modified"}
                  </TableHead>
                  <TableHead>
                    {language === "zh" && "修改人"}
                    {language === "ru" && "Изменено"}
                    {language === "en" && "Modified By"}
                  </TableHead>
                  <TableHead className="text-right">
                    {language === "zh" && "操作"}
                    {language === "ru" && "Действия"}
                    {language === "en" && "Actions"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLayouts.map(layout => {
                  const page = layout.page;
                  const Icon = pageIcons[page as keyof typeof pageIcons];
                  const isDefault = 'isDefault' in layout && layout.isDefault;

                  return (
                    <TableRow key={page}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {pageNames[page as keyof typeof pageNames][language]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDefault ? (
                          <Badge variant="secondary">
                            {language === "zh" && "默认"}
                            {language === "ru" && "По умолчанию"}
                            {language === "en" && "Default"}
                          </Badge>
                        ) : (
                          <Badge variant="default">
                            {language === "zh" && "已配置"}
                            {language === "ru" && "Настроен"}
                            {language === "en" && "Configured"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isDefault ? "-" : `v${(layout as LayoutInfo).version}`}
                      </TableCell>
                      <TableCell>
                        {isDefault
                          ? "-"
                          : format(
                              new Date((layout as LayoutInfo).updatedAt),
                              "yyyy-MM-dd HH:mm"
                            )}
                      </TableCell>
                      <TableCell>
                        {isDefault ? "-" : (layout as LayoutInfo).createdBy || "系统"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/admin/layouts/edit/${page}`)}
                        >
                          <FileEdit className="h-4 w-4 mr-1" />
                          {language === "zh" && "编辑"}
                          {language === "ru" && "Редактировать"}
                          {language === "en" && "Edit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
