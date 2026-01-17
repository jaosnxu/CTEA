/**
 * Enhanced Admin Order List Page
 *
 * Advanced features:
 * - Bulk selection with checkboxes
 * - Batch operations (status update, delete)
 * - Order export (CSV/Excel)
 * - Advanced filtering
 * - Status color coding
 * - Loading states and error handling
 * - Internationalization support
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getOrderStatusLabel,
  getOrderStatusColor,
  getAllOrderStatuses,
  formatOrderNumber,
} from "@/lib/order-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Package,
  Download,
  Trash2,
  Edit,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import type { Order, OrderStore, OrderStatus } from "@/types/order.types";

export default function EnhancedAdminOrderList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [storeFilter, setStoreFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [phoneSearch, setPhoneSearch] = useState<string>("");

  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Batch operation state
  const [showBatchStatusDialog, setShowBatchStatusDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [batchNewStatus, setBatchNewStatus] = useState<OrderStatus | "">("");
  const [batchReason, setBatchReason] = useState("");

  // Advanced filter panel state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch orders with advanced search
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = trpc.enhancedOrder.advancedSearch.useQuery({
    page,
    pageSize,
    status: statusFilter as any,
    storeId: storeFilter,
    orderNumber: searchQuery || undefined,
    customerPhone: phoneSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Fetch stores for filter
  const { data: storesData } = trpc.store.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  // Fetch statistics
  const { data: statsData } = trpc.adminOrder.getStatistics.useQuery({
    storeId: storeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Batch operations mutations
  const batchUpdateStatusMutation = trpc.enhancedOrder.batchUpdateStatus.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Batch status update completed: ${result.successCount} succeeded, ${result.failureCount} failed`
      );
      setSelectedOrders(new Set());
      setSelectAll(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Batch status update failed: ${error.message}`);
    },
  });

  const batchDeleteMutation = trpc.enhancedOrder.batchDelete.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Batch delete completed: ${result.successCount} succeeded, ${result.failureCount} failed`
      );
      setSelectedOrders(new Set());
      setSelectAll(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Batch delete failed: ${error.message}`);
    },
  });

  // Export mutations
  const exportCSVMutation = trpc.enhancedOrder.exportCSV.useMutation({
    onSuccess: (result) => {
      // Create and download file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Export completed successfully");
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleResetFilters = () => {
    setStatusFilter(undefined);
    setStoreFilter(undefined);
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setPhoneSearch("");
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders(new Set());
    } else {
      const allIds = new Set(
        ordersData?.orders.map((order) => order.id.toString()) || []
      );
      setSelectedOrders(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
    setSelectAll(newSelected.size === ordersData?.orders.length);
  };

  const handleBatchStatusUpdate = () => {
    if (!batchNewStatus || selectedOrders.size === 0) return;

    batchUpdateStatusMutation.mutate({
      orderIds: Array.from(selectedOrders),
      newStatus: batchNewStatus as OrderStatus,
      reason: batchReason || undefined,
    });

    setShowBatchStatusDialog(false);
    setBatchNewStatus("");
    setBatchReason("");
  };

  const handleBatchDelete = () => {
    if (selectedOrders.size === 0) return;

    batchDeleteMutation.mutate({
      orderIds: Array.from(selectedOrders),
      reason: batchReason || undefined,
    });

    setShowBatchDeleteDialog(false);
    setBatchReason("");
  };

  const handleExportCSV = () => {
    const filters = {
      storeId: storeFilter,
      status: statusFilter as any,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const orderIds =
      selectedOrders.size > 0 ? Array.from(selectedOrders) : undefined;

    exportCSVMutation.mutate({ filters, orderIds });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage and track all orders across stores
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            disabled={exportCSVMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₽{Number(statsData.revenue).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.byStatus.find((s) => s.status === "COMPLETED")
                  ?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.byStatus.find((s) => s.status === "PENDING")
                  ?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters & Search
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-muted-foreground"
            >
              {showAdvancedFilters ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Advanced
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show Advanced
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Basic Filters - Always Visible */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Order Number
              </label>
              <Input
                placeholder="Search by order number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Customer Phone
              </label>
              <Input
                placeholder="Search by phone"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {getAllOrderStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {getOrderStatusLabel(status, "en")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters - Collapsible with animate-fadein */}
          {showAdvancedFilters && (
            <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <label className="text-sm font-medium mb-2 block">Store</label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All stores</SelectItem>
                    {storesData?.stores.map((store: OrderStore) => (
                      <SelectItem key={store.id} value={store.id}>
                        {typeof store.name === "string"
                          ? store.name
                          : store.name?.en || store.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button onClick={handleResetFilters} variant="outline">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations Bar */}
      {selectedOrders.size > 0 && (
        <Card className="bg-secondary dark:bg-secondary border-border">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary dark:text-primary" />
                <span className="font-medium">
                  {selectedOrders.size} order(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBatchStatusDialog(true)}
                  variant="default"
                  size="sm"
                  disabled={batchUpdateStatusMutation.isPending}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
                <Button
                  onClick={() => setShowBatchDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  disabled={batchDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersData?.orders.map((order: Order) => (
                      <TableRow key={order.id.toString()}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.id.toString())}
                            onCheckedChange={() =>
                              handleSelectOrder(order.id.toString())
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatOrderNumber(order.orderNumber)}
                        </TableCell>
                        <TableCell>
                          {typeof order.store?.name === "string"
                            ? order.store.name
                            : order.store?.name?.en || "N/A"}
                        </TableCell>
                        <TableCell>
                          {order.user?.phone || order.user?.nickname || "Guest"}
                        </TableCell>
                        <TableCell>{order.orderItems?.length || 0}</TableCell>
                        <TableCell>
                          ₽{Number(order.totalAmount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getOrderStatusColor(order.status)}
                            variant="outline"
                          >
                            {getOrderStatusLabel(order.status, "en")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ordersData?.orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {ordersData && ordersData.pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, ordersData.pagination.total)} of{" "}
                    {ordersData.pagination.total} orders
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
                      disabled={page >= ordersData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Batch Status Update Dialog */}
      <AlertDialog
        open={showBatchStatusDialog}
        onOpenChange={setShowBatchStatusDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Order Status</AlertDialogTitle>
            <AlertDialogDescription>
              Update the status of {selectedOrders.size} selected order(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                New Status
              </label>
              <Select
                value={batchNewStatus}
                onValueChange={(value) => setBatchNewStatus(value as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {getAllOrderStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {getOrderStatusLabel(status, "en")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason (optional)
              </label>
              <Input
                placeholder="Enter reason for status change"
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchStatusUpdate}
              disabled={!batchNewStatus || batchUpdateStatusMutation.isPending}
            >
              {batchUpdateStatusMutation.isPending ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Dialog */}
      <AlertDialog
        open={showBatchDeleteDialog}
        onOpenChange={setShowBatchDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedOrders.size} selected
              order(s)? This action can be undone by restoring from trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason (optional)
              </label>
              <Input
                placeholder="Enter reason for deletion"
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {batchDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
