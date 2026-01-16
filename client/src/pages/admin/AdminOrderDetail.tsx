/**
 * Admin Order Detail Page
 *
 * Displays comprehensive order information including:
 * - Order basic information
 * - Customer details
 * - Store information
 * - Order items with product details
 * - Status change actions
 * - Order timeline
 */

import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  getAvailableNextStatuses,
  formatOrderNumber,
} from "@/lib/order-utils";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

export default function AdminOrderDetail() {
  const [, params] = useRoute("/admin/orders/:id");
  const orderId = params?.id;

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");

  // Fetch order details
  const {
    data: order,
    isLoading,
    refetch,
  } = trpc.adminOrder.getById.useQuery(
    { id: orderId! },
    { enabled: !!orderId }
  );

  // Change status mutation
  const changeStatusMutation = trpc.adminOrder.changeStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated successfully");
      refetch();
      setSelectedStatus("");
      setStatusReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });

  const handleStatusChange = () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    changeStatusMutation.mutate({
      id: orderId!,
      status: selectedStatus as any,
      reason: statusReason || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">Order not found</p>
            <Link href="/admin/orders">
              <Button className="mt-4">Back to Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableStatuses = getAvailableNextStatuses(order.status as any);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Order {formatOrderNumber(order.orderNumber)}
            </h1>
            <p className="text-muted-foreground">
              Created on {format(new Date(order.createdAt), "PPP")}
            </p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Current Status
              </div>
              <Badge className={getOrderStatusColor(order.status)} variant="outline">
                {getOrderStatusLabel(order.status, "en")}
              </Badge>
            </div>
          </div>

          {availableStatuses.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="text-sm font-medium">Change Status</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getOrderStatusLabel(status, "en")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Textarea
                    placeholder="Reason (optional)"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={1}
                  />
                </div>
              </div>
              <Button
                onClick={handleStatusChange}
                disabled={!selectedStatus || changeStatusMutation.isPending}
              >
                {changeStatusMutation.isPending
                  ? "Updating..."
                  : "Update Status"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Order Number</div>
              <div className="font-medium">
                {formatOrderNumber(order.orderNumber)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Store</div>
              <div className="font-medium">
                {typeof order.store?.name === "string"
                  ? order.store.name
                  : order.store?.name?.en || "N/A"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="font-medium text-lg">
                ₽{Number(order.totalAmount || 0).toFixed(2)}
              </div>
            </div>
            {order.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium">{order.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">
                {order.user?.nickname || "Guest"}
              </div>
            </div>
            {order.user?.phone && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{order.user.phone}</div>
              </div>
            )}
            {order.deliveryAddress && (
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </div>
                <div className="font-medium">
                  {typeof order.deliveryAddress === "string"
                    ? order.deliveryAddress
                    : JSON.stringify(order.deliveryAddress)}
                </div>
              </div>
            )}
            {order.paymentMethod && (
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </div>
                <div className="font-medium">{order.paymentMethod}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.orderItems?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName ||
                        item.product?.name?.en ||
                        item.product?.name ||
                        "N/A"}
                    </TableCell>
                    <TableCell>{item.productCode || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ₽{Number(item.unitPrice || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₽{Number(item.discountAmount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₽{Number(item.subtotal || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Order Totals */}
          <div className="mt-4 space-y-2 max-w-md ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>₽{Number(order.subtotalAmount || 0).toFixed(2)}</span>
            </div>
            {order.discountAmount && Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-red-600">
                  -₽{Number(order.discountAmount).toFixed(2)}
                </span>
              </div>
            )}
            {order.taxAmount && Number(order.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>₽{Number(order.taxAmount).toFixed(2)}</span>
              </div>
            )}
            {order.deliveryFee && Number(order.deliveryFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee:</span>
                <span>₽{Number(order.deliveryFee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>₽{Number(order.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
