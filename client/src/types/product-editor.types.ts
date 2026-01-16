export interface ProductFormData {
  // 基础信息
  id?: string;
  name: string;
  code: string;
  categoryId: string;
  basePrice: number;
  costPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  
  // 多语言
  nameMultiLang: {
    zh?: string;
    ru?: string;
    en?: string;
  };
  descriptionMultiLang: {
    zh?: string;
    ru?: string;
    en?: string;
  };
  
  // 规格选项
  specOptions: ProductSpecOption[];
  
  // 小料配置
  toppings: ProductTopping[];
  
  // 图片
  images: ProductImage[];
  
  // 定价规则
  pricingRuleIds: string[];
  
  // 库存
  inventory: StoreInventory[];
  
  // 营销设置
  memberDiscounts: MemberDiscount[];
  couponIds: string[];
}

export interface ProductSpecOption {
  id: string;
  type: 'SIZE' | 'TEMPERATURE' | 'SWEETNESS' | 'ICE';
  name: string;
  values: SpecValue[];
}

export interface SpecValue {
  id: string;
  label: string;
  priceAdjustment: number; // 价格调整，如 +10, -5
  isDefault: boolean;
}

export interface ProductTopping {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  maxQuantity: number; // 最大可选数量
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StoreInventory {
  storeId: string;
  storeName: string;
  stock: number;
  lowStockAlert: number; // 低库存预警值
}

export interface MemberDiscount {
  level: 'REGULAR' | 'SILVER' | 'GOLD' | 'PLATINUM';
  discountPercent: number; // 如 5 表示 95 折
}
