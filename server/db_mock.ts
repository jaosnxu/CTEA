
export interface ProductVariant {
  id: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price_adjustment: number;
}

export interface ProductAddon {
  id: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  price: number;
}

export interface Product {
  id: number;
  name_zh: string;
  name_en: string;
  name_ru: string;
  description_zh: string;
  description_en: string;
  description_ru: string;
  price: number;
  image: string;
  category: string;
  tags: string[];
  variants: ProductVariant[];
  addons: ProductAddon[];
  is_manual_override?: boolean; // Shadow DB: Prevent IIKO sync from overwriting manual changes
}

export const PRODUCTS: Product[] = [
  // --- Seasonal (Season) ---
  {
    id: 1,
    name_zh: "草莓芝士",
    name_en: "Strawberry Cheezo",
    name_ru: "Клубничный Чиз",
    description_zh: "新鲜草莓搭配茉莉茶底，覆盖浓郁芝士奶盖。",
    description_en: "Fresh strawberries blended with jasmine tea, topped with rich cheese foam.",
    description_ru: "Свежая клубника, взбитая с жасминовым чаем, под шапкой из сливочного сыра.",
    price: 350,
    image: "/images/products/strawberry_cheeso.png",
    category: "seasonal",
    tags: ["Bestseller", "New"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 60 },
    ],
    addons: [
      { id: "a3", name_zh: "芝士奶盖", name_en: "Cheese Foam", name_ru: "Сырная пенка", price: 50 },
      { id: "a4", name_zh: "果冻", name_en: "Jelly", name_ru: "Желе", price: 30 },
    ],
  },
  {
    id: 2,
    name_zh: "芒果芝士",
    name_en: "Mango Cheezo",
    name_ru: "Манго Чиз",
    description_zh: "熟透芒果与椰奶的完美结合，搭配芝士奶盖。",
    description_en: "Ripe mango meets coconut milk, topped with cheese foam.",
    description_ru: "Спелое манго, кокосовое молоко и сырная пенка. Тропическое наслаждение.",
    price: 360,
    image: "/images/products/mango_cheeso.png",
    category: "seasonal",
    tags: ["Tropical"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 60 },
    ],
    addons: [
      { id: "a3", name_zh: "芝士奶盖", name_en: "Cheese Foam", name_ru: "Сырная пенка", price: 50 },
      { id: "a1", name_zh: "珍珠", name_en: "Tapioca", name_ru: "Тапиока", price: 40 },
    ],
  },
  {
    id: 3,
    name_zh: "多肉葡萄",
    name_en: "Grape Cheezo",
    name_ru: "Виноградный Чиз",
    description_zh: "多汁葡萄搭配乌龙茶底和招牌芝士奶盖。",
    description_en: "Juicy grapes with oolong tea base and signature cheese foam.",
    description_ru: "Сочный виноград с чаем улун и фирменной сырной шапкой.",
    price: 340,
    image: "/images/products/grape_cheeso.png",
    category: "seasonal",
    tags: ["Refreshing"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 50 },
    ],
    addons: [
      { id: "a3", name_zh: "芝士奶盖", name_en: "Cheese Foam", name_ru: "Сырная пенка", price: 50 },
      { id: "a4", name_zh: "果冻", name_en: "Jelly", name_ru: "Желе", price: 30 },
    ],
  },

  // --- Milk Tea (Milk Tea) ---
  {
    id: 4,
    name_zh: "经典珍珠奶茶",
    name_en: "Classic Boba Milk Tea",
    name_ru: "Классический чай с молоком и тапиокой",
    description_zh: "浓郁红茶搭配Q弹珍珠，口感平衡。",
    description_en: "Rich black tea with chewy tapioca pearls. Perfectly balanced.",
    description_ru: "Насыщенный черный чай с молоком и жевательными шариками тапиоки.",
    price: 290,
    image: "/images/products/boba_milk.png",
    category: "milktea",
    tags: ["Classic", "Bestseller"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 50 },
    ],
    addons: [
      { id: "a1", name_zh: "珍珠", name_en: "Tapioca", name_ru: "Тапиока", price: 40 },
      { id: "a2", name_zh: "布丁", name_en: "Pudding", name_ru: "Пудинг", price: 40 },
    ],
  },
  {
    id: 5,
    name_zh: "黑糖珍珠鲜奶",
    name_en: "Brown Sugar Boba Milk",
    name_ru: "Молоко с коричневым сахаром и тапиокой",
    description_zh: "古法黑糖熬制珍珠，搭配新鲜牛乳。",
    description_en: "Slow-cooked brown sugar boba with fresh milk.",
    description_ru: "Тапиока в коричневом сахаре со свежим молоком. Сладкий и сливочный.",
    price: 320,
    image: "/images/products/boba_milk.png", // Reusing placeholder for demo
    category: "milktea",
    tags: ["Sweet", "No Caffeine"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
    ],
    addons: [
      { id: "a2", name_zh: "布丁", name_en: "Pudding", name_ru: "Пудинг", price: 40 },
    ],
  },
  {
    id: 6,
    name_zh: "茉莉奶绿",
    name_en: "Jasmine Green Milk Tea",
    name_ru: "Жасминовый зеленый чай с молоком",
    description_zh: "清新茉莉花茶搭配丝滑奶香。",
    description_en: "Fresh jasmine green tea with silky milk.",
    description_ru: "Свежий жасминовый чай с нежным молоком.",
    price: 280,
    image: "/images/products/lemon_tea.png", // Reusing placeholder for demo
    category: "milktea",
    tags: ["Light"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 40 },
    ],
    addons: [
      { id: "a1", name_zh: "珍珠", name_en: "Tapioca", name_ru: "Тапиока", price: 40 },
    ],
  },

  // --- Mall (Mall) ---
  {
    id: 7,
    name_zh: "CHU 随行杯",
    name_en: "CHU Tumbler",
    name_ru: "Термокружка CHU",
    description_zh: "双层不锈钢保温杯，磨砂质感。",
    description_en: "Double-walled stainless steel tumbler with matte finish.",
    description_ru: "Двухстенная термокружка из нержавеющей стали с матовым покрытием.",
    price: 1290,
    image: "/images/products/berry_slush.png", // Placeholder
    category: "mall",
    tags: ["Merch"],
    variants: [],
    addons: [],
  },
  {
    id: 8,
    name_zh: "CHU 帆布袋",
    name_en: "CHU Tote Bag",
    name_ru: "Шоппер CHU",
    description_zh: "环保棉质帆布袋，大容量设计。",
    description_en: "Eco-friendly cotton canvas tote bag. Large capacity.",
    description_ru: "Экологичная сумка-шоппер из хлопка. Большая вместимость.",
    price: 590,
    image: "/images/products/peach_oolong.png", // Placeholder
    category: "mall",
    tags: ["Merch", "Eco"],
    variants: [],
    addons: [],
  },
  {
    id: 9,
    name_zh: "礼品卡 (500₽)",
    name_en: "Gift Card (500₽)",
    name_ru: "Подарочная карта (500₽)",
    description_zh: "送给朋友的一杯温暖。",
    description_en: "A warm gift for your friends.",
    description_ru: "Теплый подарок для друзей.",
    price: 500,
    image: "/images/products/mixed_fruit.png", // Placeholder
    category: "mall",
    tags: ["Gift"],
    variants: [],
    addons: [],
  },
  {
    id: 10,
    name_zh: "DIY 奶茶套装",
    name_en: "DIY Milk Tea Kit",
    name_ru: "Набор для приготовления чая",
    description_zh: "在家也能做出的专业味道。",
    description_en: "Professional taste made at home.",
    description_ru: "Профессиональный вкус, приготовленный дома.",
    price: 1590,
    image: "/images/products/boba_milk.png", // Placeholder
    category: "mall",
    tags: ["Kit"],
    variants: [],
    addons: [],
  },
];

export interface OrderItem {
  productId: number;
  productName: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  prefix: "T" | "P" | "K" | "M";
  items: OrderItem[];
  total: number;
  status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED" | "VOIDED";
  createdAt: string;
}

export const ORDERS: Order[] = [
  {
    id: "P20240106001",
    prefix: "P",
    items: [
      { productId: 1, productName: "Strawberry Cheezo", variant: "Regular", quantity: 1, price: 350 },
      { productId: 4, productName: "Classic Boba Milk Tea", variant: "Large", quantity: 1, price: 340 }
    ],
    total: 690,
    status: "COMPLETED",
    createdAt: "2024-01-06T10:30:00Z"
  },
  {
    id: "M20240106002",
    prefix: "M",
    items: [
      { productId: 2, productName: "Mango Cheezo", variant: "Regular", quantity: 2, price: 720 }
    ],
    total: 720,
    status: "PAID",
    createdAt: "2024-01-06T11:15:00Z"
  }
];

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  level: string;
  points: number;
  coupons: number;
  balance: number;
}

export const USER_PROFILE: UserProfile = {
  id: "u1",
  name: "Tea Lover",
  phone: "138****8888",
  level: "VIP.1",
  points: 128,
  coupons: 2,
  balance: 0
};
