/**
 * 布局历史版本组件
 * 显示和还原历史版本
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { RotateCcw, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PageType } from "@shared/types/layout";

interface LayoutHistoryProps {
  page: PageType;
  language: "zh" | "ru" | "en";
  onClose: () => void;
  onRestore: (version: number) => void;
}

export function LayoutHistory({
  page,
  language,
  onClose,
  onRestore,
}: LayoutHistoryProps) {
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  // 获取历史版本
  const historyQuery = trpc.layout.history.useQuery({
    page,
    limit: 20,
  });

  // 还原版本
  const restoreMutation = trpc.layout.restore.useMutation({
    onSuccess: () => {
      toast.success(
        language === "zh"
          ? "版本还原成功"
          : language === "ru"
            ? "Версия восстановлена"
            : "Version restored successfully"
      );
      setRestoringVersion(null);
      onRestore(restoringVersion!);
    },
    onError: error => {
      toast.error(
        language === "zh"
          ? `还原失败: ${error.message}`
          : language === "ru"
            ? `Ошибка восстановления: ${error.message}`
            : `Restore failed: ${error.message}`
      );
      setRestoringVersion(null);
    },
  });

  const handleRestore = (version: number) => {
    setRestoringVersion(version);
    restoreMutation.mutate({ page, version });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === "zh" && "版本历史"}
            {language === "ru" && "История версий"}
            {language === "en" && "Version History"}
          </DialogTitle>
          <DialogDescription>
            {language === "zh" && "查看和还原历史版本"}
            {language === "ru" &&
              "Просмотр и восстановление исторических версий"}
            {language === "en" && "View and restore historical versions"}
          </DialogDescription>
        </DialogHeader>

        {historyQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : historyQuery.data?.versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === "zh" && "暂无历史版本"}
            {language === "ru" && "Нет исторических версий"}
            {language === "en" && "No history versions"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {language === "zh" && "版本"}
                  {language === "ru" && "Версия"}
                  {language === "en" && "Version"}
                </TableHead>
                <TableHead>
                  {language === "zh" && "状态"}
                  {language === "ru" && "Статус"}
                  {language === "en" && "Status"}
                </TableHead>
                <TableHead>
                  {language === "zh" && "创建时间"}
                  {language === "ru" && "Дата создания"}
                  {language === "en" && "Created At"}
                </TableHead>
                <TableHead>
                  {language === "zh" && "创建人"}
                  {language === "ru" && "Создано"}
                  {language === "en" && "Created By"}
                </TableHead>
                <TableHead className="text-right">
                  {language === "zh" && "操作"}
                  {language === "ru" && "Действия"}
                  {language === "en" && "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data?.versions.map(version => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">
                    v{version.version}
                  </TableCell>
                  <TableCell>
                    {version.isActive ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {language === "zh" && "当前"}
                        {language === "ru" && "Текущая"}
                        {language === "en" && "Active"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {language === "zh" && "历史"}
                        {language === "ru" && "История"}
                        {language === "en" && "History"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(version.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>{version.createdBy || "系统"}</TableCell>
                  <TableCell className="text-right">
                    {!version.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(version.version)}
                        disabled={restoringVersion === version.version}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {restoringVersion === version.version
                          ? language === "zh"
                            ? "还原中..."
                            : language === "ru"
                              ? "Восстановление..."
                              : "Restoring..."
                          : language === "zh"
                            ? "还原"
                            : language === "ru"
                              ? "Восстановить"
                              : "Restore"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
