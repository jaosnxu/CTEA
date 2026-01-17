/**
 * Order Lifecycle Timeline Component
 * 
 * Visualizes order operations and state changes as a timeline
 */

import { useState } from "react";
import { trpc } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2,
  Plus,
  RefreshCw 
} from "lucide-react";
import { format } from "date-fns";
import { getOrderStatusI18n, formatDateI18n, Locale } from "@/lib/order-i18n";

interface OrderLifecycleTimelineProps {
  orderId: string;
  locale?: Locale;
}

export function OrderLifecycleTimeline({
  orderId,
  locale = "en",
}: OrderLifecycleTimelineProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.enhancedOrder.getOrderLogs.useQuery({
    orderId,
    page,
    pageSize,
  });

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <Plus className="h-4 w-4" />;
      case "UPDATE":
        return <Edit className="h-4 w-4" />;
      case "DELETE":
        return <Trash2 className="h-4 w-4" />;
      case "STATUS_CHANGE":
        return <RefreshCw className="h-4 w-4" />;
      case "APPROVE":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECT":
        return <XCircle className="h-4 w-4" />;
      case "NOTE_ADD":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return "text-primary bg-secondary dark:bg-secondary";
      case "UPDATE":
        return "text-primary bg-secondary dark:bg-secondary";
      case "DELETE":
        return "text-destructive bg-destructive/10 dark:bg-destructive/20";
      case "STATUS_CHANGE":
        return "text-accent-foreground bg-accent dark:bg-accent";
      case "APPROVE":
        return "text-primary bg-secondary dark:bg-secondary";
      case "REJECT":
        return "text-destructive bg-destructive/10 dark:bg-destructive/20";
      case "NOTE_ADD":
        return "text-muted-foreground bg-muted dark:bg-muted";
      default:
        return "text-muted-foreground bg-muted dark:bg-muted";
    }
  };

  const getOperatorTypeLabel = (type: string | null) => {
    if (!type) return "System";
    
    const labels: Record<string, Record<Locale, string>> = {
      CUSTOMER: { en: "Customer", ru: "Клиент", zh: "客户" },
      STORE_STAFF: { en: "Store Staff", ru: "Сотрудник магазина", zh: "门店员工" },
      HQ_ADMIN: { en: "HQ Admin", ru: "Администратор", zh: "总部管理员" },
      SYSTEM: { en: "System", ru: "Система", zh: "系统" },
    };

    return labels[type]?.[locale] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No history logs found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Order History & Logs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.logs.map((log, index) => (
            <div
              key={log.id.toString()}
              className="relative pl-8 pb-6 border-l-2 border-border dark:border-border last:border-0 last:pb-0"
            >
              {/* Timeline Icon */}
              <div
                className={`absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                  log.action
                )}`}
              >
                {getActionIcon(log.action)}
              </div>

              {/* Log Content */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {log.action}
                      </Badge>
                      {log.previousStatus && log.newStatus && (
                        <div className="flex items-center gap-1 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {getOrderStatusI18n(log.previousStatus, locale)}
                          </Badge>
                          <span>→</span>
                          <Badge variant="outline" className="text-xs">
                            {getOrderStatusI18n(log.newStatus, locale)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {log.notes}
                      </p>
                    )}

                    {log.changes && typeof log.changes === "object" && (
                      <div className="mt-2 p-2 bg-muted dark:bg-muted rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateI18n(log.createdAt, locale)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {log.operatorName || log.operatorId || "System"}
                  </span>
                  <span>·</span>
                  <span>{getOperatorTypeLabel(log.operatorType)}</span>
                  {log.ipAddress && (
                    <>
                      <span>·</span>
                      <span>{log.ipAddress}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {page} of {data.pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
