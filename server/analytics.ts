/**
 * CHU TEA - Analytics & Reporting System
 * 
 * Features:
 * - Sales reports
 * - Product performance
 * - User behavior tracking
 * - Revenue analytics
 */

export interface SalesReport {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  revenueByCategory: Record<string, number>;
  ordersByStatus: Record<string, number>;
}

export interface ProductAnalytics {
  productId: number;
  productName: string;
  views: number;
  addToCartCount: number;
  purchaseCount: number;
  conversionRate: number;
  totalRevenue: number;
  averageRating?: number;
}

export interface UserBehavior {
  userId: string;
  sessionCount: number;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  favoriteProducts: number[];
  preferredCategory?: string;
}

export interface RevenueMetrics {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  growth: {
    daily: number;  // percentage
    weekly: number;
    monthly: number;
  };
}

// ============================================================================
// Mock Data
// ============================================================================

export const PRODUCT_VIEWS: Map<number, number> = new Map();
export const PRODUCT_ADD_TO_CART: Map<number, number> = new Map();
export const USER_SESSIONS: Map<string, number> = new Map();

// ============================================================================
// Functions
// ============================================================================

/**
 * Track product view
 */
export function trackProductView(productId: number): void {
  const current = PRODUCT_VIEWS.get(productId) || 0;
  PRODUCT_VIEWS.set(productId, current + 1);
}

/**
 * Track add to cart
 */
export function trackAddToCart(productId: number): void {
  const current = PRODUCT_ADD_TO_CART.get(productId) || 0;
  PRODUCT_ADD_TO_CART.set(productId, current + 1);
}

/**
 * Track user session
 */
export function trackUserSession(userId: string): void {
  const current = USER_SESSIONS.get(userId) || 0;
  USER_SESSIONS.set(userId, current + 1);
}

/**
 * Generate sales report
 */
export function generateSalesReport(
  period: SalesReport['period'],
  startDate: Date,
  endDate: Date,
  orders: any[]
): SalesReport {
  // Filter orders by date range
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Calculate metrics
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Top products
  const productSales: Map<number, { name: string; quantity: number; revenue: number }> = new Map();
  
  filteredOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      const existing = productSales.get(item.productId) || {
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      
      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;
      
      productSales.set(item.productId, existing);
    });
  });

  const topProducts = Array.from(productSales.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      quantity: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Revenue by category (mock)
  const revenueByCategory: Record<string, number> = {
    seasonal: totalRevenue * 0.4,
    milktea: totalRevenue * 0.35,
    greentea: totalRevenue * 0.25,
  };

  // Orders by status
  const ordersByStatus: Record<string, number> = {};
  filteredOrders.forEach(order => {
    ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
  });

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRevenue,
    totalOrders,
    averageOrderValue,
    topProducts,
    revenueByCategory,
    ordersByStatus,
  };
}

/**
 * Get product analytics
 */
export function getProductAnalytics(productId: number, orders: any[]): ProductAnalytics {
  const views = PRODUCT_VIEWS.get(productId) || 0;
  const addToCartCount = PRODUCT_ADD_TO_CART.get(productId) || 0;
  
  // Count purchases
  let purchaseCount = 0;
  let totalRevenue = 0;
  let productName = '';
  
  orders.forEach(order => {
    order.items?.forEach((item: any) => {
      if (item.productId === productId) {
        purchaseCount += item.quantity;
        totalRevenue += item.price * item.quantity;
        productName = item.productName;
      }
    });
  });
  
  const conversionRate = views > 0 ? (purchaseCount / views) * 100 : 0;
  
  return {
    productId,
    productName,
    views,
    addToCartCount,
    purchaseCount,
    conversionRate,
    totalRevenue,
  };
}

/**
 * Get user behavior analytics
 */
export function getUserBehavior(userId: string, orders: any[]): UserBehavior {
  const userOrders = orders.filter(o => o.userId === userId);
  const sessionCount = USER_SESSIONS.get(userId) || 0;
  const totalOrders = userOrders.length;
  const totalSpent = userOrders.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  
  const lastOrder = userOrders.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  
  // Find favorite products
  const productCounts: Map<number, number> = new Map();
  userOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      const count = productCounts.get(item.productId) || 0;
      productCounts.set(item.productId, count + item.quantity);
    });
  });
  
  const favoriteProducts = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productId]) => productId);
  
  return {
    userId,
    sessionCount,
    totalOrders,
    totalSpent,
    averageOrderValue,
    lastOrderDate: lastOrder?.createdAt || '',
    favoriteProducts,
  };
}

/**
 * Get revenue metrics
 */
export function getRevenueMetrics(orders: any[]): RevenueMetrics {
  const now = new Date();
  
  // Helper to get revenue for date range
  const getRevenue = (start: Date, end: Date): number => {
    return orders
      .filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= start && orderDate <= end && o.status !== 'VOIDED';
      })
      .reduce((sum, o) => sum + o.total, 0);
  };
  
  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const today = getRevenue(todayStart, todayEnd);
  
  // Yesterday
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = getRevenue(yesterdayStart, todayStart);
  
  // This week
  const thisWeekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
  const thisWeek = getRevenue(thisWeekStart, now);
  
  // Last week
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeek = getRevenue(lastWeekStart, thisWeekStart);
  
  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = getRevenue(thisMonthStart, now);
  
  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = getRevenue(lastMonthStart, thisMonthStart);
  
  // Calculate growth
  const dailyGrowth = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
  const weeklyGrowth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  
  return {
    today,
    yesterday,
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
    growth: {
      daily: dailyGrowth,
      weekly: weeklyGrowth,
      monthly: monthlyGrowth,
    },
  };
}

/**
 * Get dashboard summary
 */
export function getDashboardSummary(orders: any[]): {
  revenue: RevenueMetrics;
  topProducts: Array<{ productId: number; name: string; sales: number }>;
  recentOrders: any[];
  totalCustomers: number;
} {
  const revenue = getRevenueMetrics(orders);
  
  // Top products (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
  
  const productSales: Map<number, { name: string; sales: number }> = new Map();
  recentOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      const existing = productSales.get(item.productId) || { name: item.productName, sales: 0 };
      existing.sales += item.quantity;
      productSales.set(item.productId, existing);
    });
  });
  
  const topProducts = Array.from(productSales.entries())
    .map(([productId, data]) => ({ productId, name: data.name, sales: data.sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
  
  // Recent orders
  const latestOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  // Total customers (unique user IDs)
  const uniqueCustomers = new Set(orders.map(o => o.userId || o.id)).size;
  
  return {
    revenue,
    topProducts,
    recentOrders: latestOrders,
    totalCustomers: uniqueCustomers,
  };
}
