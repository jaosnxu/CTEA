
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
}

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name_zh: "经典珍珠奶茶",
    name_en: "Classic Boba Milk Tea",
    name_ru: "Классический чай с молоком и тапиокой",
    description_zh: "浓郁红茶搭配Q弹珍珠，口感平衡。",
    description_en: "Rich black tea with chewy tapioca pearls. Perfectly balanced.",
    description_ru: "Насыщенный черный чай с молоком и жевательными шариками тапиоки. Идеальный баланс вкуса.",
    price: 290, // Rubles
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
    id: 2,
    name_zh: "草莓芝士",
    name_en: "Strawberry Cheezo",
    name_ru: "Клубничный Чиз",
    description_zh: "新鲜草莓搭配茉莉茶底，覆盖浓郁芝士奶盖。",
    description_en: "Fresh strawberries blended with jasmine tea, topped with rich cheese foam.",
    description_ru: "Свежая клубника, взбитая с жасминовым чаем, под шапкой из сливочного сыра. Сладкий и нежный.",
    price: 350,
    image: "/images/products/strawberry_cheeso.png",
    category: "fruit_tea",
    tags: ["Seasonal", "Sweet"],
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
    id: 3,
    name_zh: "芒果芝士",
    name_en: "Mango Cheezo",
    name_ru: "Манго Чиз",
    description_zh: "熟透芒果与椰奶的完美结合，搭配芝士奶盖。",
    description_en: "Ripe mango meets coconut milk, topped with cheese foam.",
    description_ru: "Спелое манго, кокосовое молоко и сырная пенка. Тропическое наслаждение в каждом глотке.",
    price: 360,
    image: "/images/products/mango_cheeso.png",
    category: "fruit_tea",
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
    id: 4,
    name_zh: "多肉葡萄",
    name_en: "Grape Cheezo",
    name_ru: "Виноградный Чиз",
    description_zh: "多汁葡萄搭配乌龙茶底和招牌芝士奶盖。",
    description_en: "Juicy grapes with oolong tea base and signature cheese foam.",
    description_ru: "Сочный виноград с чаем улун и фирменной сырной шапкой. Освежающий и богатый вкус.",
    price: 340,
    image: "/images/products/grape_cheeso.png",
    category: "fruit_tea",
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
  {
    id: 5,
    name_zh: "手打柠檬茶",
    name_en: "Signature Lemon Tea",
    name_ru: "Освежающий Лимонный Чай",
    description_zh: "经典红茶搭配新鲜柠檬，清新自然。",
    description_en: "Classic black tea with fresh lemon. Refreshing and natural.",
    description_ru: "Классический черный чай со свежим лимоном. Бодрящий и натуральный вкус.",
    price: 250,
    image: "/images/products/lemon_tea.png",
    category: "fruit_tea",
    tags: ["Classic"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 40 },
    ],
    addons: [
      { id: "a4", name_zh: "果冻", name_en: "Jelly", name_ru: "Желе", price: 30 },
      { id: "a5", name_zh: "芦荟", name_en: "Aloe", name_ru: "Алоэ", price: 40 },
    ],
  },
  {
    id: 6,
    name_zh: "白桃乌龙",
    name_en: "Peach Oolong",
    name_ru: "Персиковый Улун",
    description_zh: "香气四溢的乌龙茶搭配成熟白桃果肉。",
    description_en: "Aromatic oolong tea with ripe peach pulp.",
    description_ru: "Ароматный улун с кусочками спелого персика. Легкий и фруктовый.",
    price: 320,
    image: "/images/products/peach_oolong.png",
    category: "fruit_tea",
    tags: ["Aromatic"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 50 },
    ],
    addons: [
      { id: "a3", name_zh: "芝士奶盖", name_en: "Cheese Foam", name_ru: "Сырная пенка", price: 50 },
      { id: "a4", name_zh: "果冻", name_en: "Jelly", name_ru: "Желе", price: 30 },
    ],
  },
  {
    id: 7,
    name_zh: "超级水果茶",
    name_en: "Super Fruit Tea",
    name_ru: "Фруктовый Микс",
    description_zh: "绿茶底搭配多种新鲜水果，维C满满。",
    description_en: "Green tea base with assorted fresh fruits. Vitamin C packed.",
    description_ru: "Ассорти из свежих фруктов на основе зеленого чая. Витаминный заряд.",
    price: 380,
    image: "/images/products/mixed_fruit.png",
    category: "fruit_tea",
    tags: ["Vitamin C"],
    variants: [
      { id: "v1", name_zh: "标准 (1000ml)", name_en: "Regular (1000ml)", name_ru: "Стандарт (1000мл)", price_adjustment: 0 },
    ],
    addons: [
      { id: "a5", name_zh: "芦荟", name_en: "Aloe", name_ru: "Алоэ", price: 40 },
    ],
  },
  {
    id: 8,
    name_zh: "莓莓冰沙",
    name_en: "Berry Slush",
    name_ru: "Ягодный Слаш",
    description_zh: "森林浆果制成的冰沙，夏日解暑神器。",
    description_en: "Icy slush made from forest berries. Perfect for hot days.",
    description_ru: "Ледяной коктейль из лесных ягод. Идеально для жаркого дня.",
    price: 330,
    image: "/images/products/berry_slush.png",
    category: "slush",
    tags: ["Icy"],
    variants: [
      { id: "v1", name_zh: "标准 (500ml)", name_en: "Regular (500ml)", name_ru: "Стандарт (500мл)", price_adjustment: 0 },
      { id: "v2", name_zh: "大杯 (700ml)", name_en: "Large (700ml)", name_ru: "Большой (700мл)", price_adjustment: 50 },
    ],
    addons: [
      { id: "a3", name_zh: "芝士奶盖", name_en: "Cheese Foam", name_ru: "Сырная пенка", price: 50 },
    ],
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
      { productId: 2, productName: "Strawberry Cheezo", variant: "Regular", quantity: 1, price: 350 },
      { productId: 1, productName: "Classic Boba Milk Tea", variant: "Large", quantity: 1, price: 340 }
    ],
    total: 690,
    status: "COMPLETED",
    createdAt: "2024-01-06T10:30:00Z"
  },
  {
    id: "M20240106002",
    prefix: "M",
    items: [
      { productId: 3, productName: "Mango Cheezo", variant: "Regular", quantity: 2, price: 720 }
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
