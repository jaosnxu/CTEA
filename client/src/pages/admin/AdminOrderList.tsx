/**
 * Admin Order List Page
 *
 * Displays a comprehensive list of orders with:
 * - Filtering by status, store, date range
 * - Search functionality
 * - Pagination
 * - Status badges
 * - Navigation to detail page
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  getOrderStatusLabel,
  getOrderStatusColor,
  getAllOrderStatuses,
  formatOrderNumber,
} from "@/lib/order-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, RefreshCw, Eye, Package } from "lucide-react";
import { format } from "date-fns";

export default function AdminOrderList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [storeFilter, setStoreFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch orders
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = trpc.adminOrder.list.useQuery({
    page,
    pageSize,
    status: statusFilter as any,
    storeId: storeFilter,
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

  const handleRefresh = () => {
    refetch();
  };

  const handleResetFilters = () => {
    setStatusFilter(undefined);
    setStoreFilter(undefined);
    setStartDate("");
    setEndDate("");
    setPage(1);
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
        <Button onClick={handleRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="text-sm font-medium mb-2 block">Store</label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All stores</SelectItem>
                  {storesData?.stores.map((store: any) => (
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

          <div className="flex gap-2 mt-4">
            <Button onClick={handleResetFilters} variant="outline">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    {ordersData?.orders.map((order: any) => (
                      <TableRow key={order.id}>
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
                        <TableCell colSpan={8} className="text-center py-8">
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
    </div>
  );
}
