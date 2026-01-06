/**
 * CHU TEA - Delivery Management System
 * 
 * Features:
 * - Address management
 * - Delivery zones and fees
 * - Driver assignment
 * - Real-time tracking
 */

export interface DeliveryAddress {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  building?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
  fee: number;
  minOrderAmount: number;
  estimatedTime: number;  // in minutes
  isActive: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentOrders: string[];
  totalDeliveries: number;
  rating: number;
}

export interface DeliveryOrder {
  id: string;
  orderId: string;
  addressId: string;
  driverId?: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Mock Data
// ============================================================================

export const DELIVERY_ADDRESSES: DeliveryAddress[] = [];

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone1',
    name: 'Центр Москвы',
    polygon: [],  // Would contain actual coordinates
    fee: 0,
    minOrderAmount: 500,
    estimatedTime: 30,
    isActive: true,
  },
  {
    id: 'zone2',
    name: 'Пригород',
    polygon: [],
    fee: 150,
    minOrderAmount: 800,
    estimatedTime: 45,
    isActive: true,
  },
];

export const DRIVERS: Driver[] = [
  {
    id: 'driver1',
    name: 'Иван Петров',
    phone: '+7 (900) 123-45-67',
    status: 'AVAILABLE',
    currentOrders: [],
    totalDeliveries: 150,
    rating: 4.8,
  },
  {
    id: 'driver2',
    name: 'Алексей Сидоров',
    phone: '+7 (900) 765-43-21',
    status: 'AVAILABLE',
    currentOrders: [],
    totalDeliveries: 200,
    rating: 4.9,
  },
];

export const DELIVERY_ORDERS: DeliveryOrder[] = [];

// ============================================================================
// Functions
// ============================================================================

/**
 * Add delivery address
 */
export function addDeliveryAddress(address: Omit<DeliveryAddress, 'id' | 'createdAt'>): DeliveryAddress {
  const newAddress: DeliveryAddress = {
    ...address,
    id: `ADDR${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // If this is the first address or marked as default, set it as default
  if (address.isDefault || DELIVERY_ADDRESSES.filter(a => a.userId === address.userId).length === 0) {
    // Unset other defaults for this user
    DELIVERY_ADDRESSES.forEach(a => {
      if (a.userId === address.userId) {
        a.isDefault = false;
      }
    });
    newAddress.isDefault = true;
  }

  DELIVERY_ADDRESSES.push(newAddress);
  console.log(`[Delivery] Address added for user ${address.userId}`);

  return newAddress;
}

/**
 * Get user addresses
 */
export function getUserAddresses(userId: string): DeliveryAddress[] {
  return DELIVERY_ADDRESSES.filter(a => a.userId === userId);
}

/**
 * Calculate delivery fee
 */
export function calculateDeliveryFee(lat: number, lng: number, orderAmount: number): {
  zone: DeliveryZone | null;
  fee: number;
  canDeliver: boolean;
  message?: string;
} {
  // In production, this would use actual geolocation calculations
  // For now, return default zone
  const zone = DELIVERY_ZONES[0];

  if (orderAmount < zone.minOrderAmount) {
    return {
      zone,
      fee: zone.fee,
      canDeliver: false,
      message: `Минимальная сумма заказа: ₽${zone.minOrderAmount}`,
    };
  }

  return {
    zone,
    fee: zone.fee,
    canDeliver: true,
  };
}

/**
 * Assign driver to order
 */
export function assignDriver(orderId: string): Driver | null {
  // Find available driver
  const driver = DRIVERS.find(d => d.status === 'AVAILABLE');

  if (!driver) {
    console.log('[Delivery] No available drivers');
    return null;
  }

  driver.status = 'BUSY';
  driver.currentOrders.push(orderId);

  console.log(`[Delivery] Driver ${driver.name} assigned to order ${orderId}`);

  return driver;
}

/**
 * Update delivery status
 */
export function updateDeliveryStatus(orderId: string, status: DeliveryOrder['status']): boolean {
  const delivery = DELIVERY_ORDERS.find(d => d.orderId === orderId);

  if (!delivery) {
    return false;
  }

  delivery.status = status;
  delivery.updatedAt = new Date().toISOString();

  if (status === 'DELIVERED') {
    delivery.actualDeliveryTime = new Date().toISOString();

    // Free up driver
    if (delivery.driverId) {
      const driver = DRIVERS.find(d => d.id === delivery.driverId);
      if (driver) {
        driver.currentOrders = driver.currentOrders.filter(o => o !== orderId);
        if (driver.currentOrders.length === 0) {
          driver.status = 'AVAILABLE';
        }
        driver.totalDeliveries++;
      }
    }
  }

  console.log(`[Delivery] Order ${orderId} status updated to ${status}`);

  return true;
}

/**
 * Create delivery order
 */
export function createDeliveryOrder(
  orderId: string,
  addressId: string,
  deliveryFee: number
): DeliveryOrder {
  const delivery: DeliveryOrder = {
    id: `DEL${Date.now()}`,
    orderId,
    addressId,
    status: 'PENDING',
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    deliveryFee,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  DELIVERY_ORDERS.push(delivery);

  // Auto-assign driver
  const driver = assignDriver(orderId);
  if (driver) {
    delivery.driverId = driver.id;
    delivery.status = 'ASSIGNED';
  }

  return delivery;
}
