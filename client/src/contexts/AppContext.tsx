import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { formatCurrency } from "@/lib/i18n";

// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  desc: string;
  energy: number; // kcal
  sugar: number; // g
  likes: number;
  reviews: number;
}

export interface CartItem extends Product {
  quantity: number;
  specs: string; // 基础Параметры（чашек型、Температура、甘度）
  toppings?: { name: string; price: number }[]; // 小料列表
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: "pending" | "preparing" | "ready" | "completed";
  date: string;
  createdAt: number;
  type: "pickup" | "delivery";
  source: "drink" | "mall"; // 区分订заказов来源
  pickupCode: string; // Код получения, 格式：T + 4 человек数字
  review?: OrderReview; // 订заказов评价
}

export interface OrderReview {
  id: string;
  orderId: string;
  rating: number; // 1-5星
  comment: string;
  images: string[]; // Фото отзыва
  createdAt: number;
}

export interface InfluencerData {
  balance: number;
  totalReferrals: number;
  monthlyReferrals: number;
  rank: number;
  activities: {
    id: number;
    type: "task" | "referral" | "withdraw";
    title: string;
    time: string;
    amount: string;
  }[];
}

export interface UserProfile {
  name: string;
  phone: string;
  avatar: string;
  level: "Normal" | "Silver" | "Gold" | "Platinum"; // 普通、银卡、金卡、黑金卡
  totalSpent: number; // 累计消费金额
}

// 会员等级配置
export const MEMBER_LEVELS = {
  Normal: {
    name: "Обычный участник",
    threshold: 0,
    discount: 1.0,
    color: "#9CA3AF",
    benefits: ["Базовые баллы", "Скидка в день рождения"],
  },
  Silver: {
    name: "Серебряный участник",
    threshold: 500,
    discount: 0.98,
    color: "#C0C0C0",
    benefits: ["Потратьте 500₽", "Скидка 2%", "Приоритетное бронирование"],
  },
  Gold: {
    name: "Золотой участник",
    threshold: 2000,
    discount: 0.95,
    color: "#FFD700",
    benefits: ["Потратьте 2000₽", "Скидка 5%", "Персональный менеджер"],
  },
  Platinum: {
    name: "Платиновый участник",
    threshold: 5000,
    discount: 0.9,
    color: "#1F2937",
    benefits: ["Потратьте 5000₽", "Скидка 10%", "Эксклюзивные привилегии"],
  },
};

export interface Coupon {
  id: string;
  name: string;
  discount: number;
  minAmount: number;
  validUntil: string;
  available: boolean;
  source?: "system" | "referral" | "activity"; // Скидка券来源
  referralCode?: string; // Код приглашения（如果是通过邀请获得）
  description?: string;
}

export interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  image: string;
  type: "drink" | "mall";
  addedAt: number;
}

export interface GiftCard {
  id: string;
  code: string; // 礼品卡卡号
  balance: number; // 余额
  initialAmount: number; // 初始金额
  status: "active" | "used" | "expired"; // Статус
  purchasedAt: number; // 购买时间
  expiresAt: number; // 过期时间
  from?: string; // 赠送者
  to?: string; // 接收者
  message?: string; // 赠送留言
  transactions: GiftCardTransaction[]; // Использовать记录
}

export interface GiftCardTransaction {
  id: string;
  amount: number; // Использовать金额
  type: "purchase" | "use" | "refund"; // 交易类型
  orderId?: string; // 关联订заказов
  createdAt: number;
  description: string;
}

interface AppContextType {
  // State
  drinkCart: CartItem[];
  mallCart: CartItem[];
  orders: Order[];
  userPoints: number;
  influencerData: InfluencerData;
  userProfile: UserProfile;
  coupons: Coupon[];
  selectedCouponId: string | null;
  city: string;
  favorites: FavoriteItem[];
  giftCards: GiftCard[]; // 礼品卡列表

  // Database products
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;

  // Actions
  setCity: (city: string) => void;
  addToDrinkCart: (item: Partial<CartItem> & { productId: string }) => void;
  updateDrinkCartQuantity: (productId: string, quantity: number) => void;
  removeFromDrinkCart: (productId: string) => void;
  clearDrinkCart: () => void;

  addToMallCart: (item: Partial<CartItem> & { productId: string }) => void;
  updateMallCartQuantity: (productId: string, quantity: number) => void;
  removeFromMallCart: (productId: string) => void;
  clearMallCart: () => void;

  deductPoints: (amount: number) => void;
  addOrder: (
    order: Omit<Order, "id" | "date" | "createdAt" | "pickupCode">
  ) => Order;
  cancelOrder: (orderId: string) => void;
  withdrawFunds: () => void;
  selectCoupon: (couponId: string | null) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addCoupon: (coupon: Coupon) => void;
  useCoupon: (id: string) => void;
  addToFavorites: (item: FavoriteItem) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addReview: (
    orderId: string,
    rating: number,
    comment: string,
    images?: string[]
  ) => void;
  reviews: OrderReview[]; // 评价列表
  refreshProducts: () => Promise<void>; // Refresh products from API

  // 礼品卡方法
  purchaseGiftCard: (amount: number) => GiftCard;
  transferGiftCard: (cardId: string, to: string, message?: string) => void;
  useGiftCard: (cardId: string, amount: number, orderId: string) => boolean;
  getGiftCardBalance: (cardId: string) => number;

  resetAllData: () => void;

  // Computed
  drinkCartTotal: number;
  drinkCartCount: number;
  mallCartTotal: number;
  mallCartCount: number;
}

// Mock Data
export const CATEGORIES = [
  { id: "season", name: "Сезонное", icon: "🌟" },
  { id: "top", name: "Популярное", icon: "🔥" },
  { id: "fruit", name: "Фруктовый чай", icon: "🍋" },
  { id: "milk", name: "Молочный чай", icon: "🧋" },
  { id: "coffee", name: "Кофе", icon: "☕" },
];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Виноградный фреш с желе",
    price: 29,
    image: "/images/products/drink_01.png",
    category: "season",
    desc: "Отборный сезонный виноград Кёхо, очищенная вручную мякоть, освежающая основа из зелёного чая и упругое желе.",
    energy: 280,
    sugar: 18,
    likes: 1240,
    reviews: 88,
  },
  {
    id: "2",
    name: "Клубника с сыром",
    price: 28,
    image: "/images/products/drink_02.png",
    category: "top",
    desc: "Отборная клубника премиум-класса, основа из зелёного чая и насыщенная сырная пенка, кисло-сладкий вкус.",
    energy: 320,
    sugar: 22,
    likes: 3500,
    reviews: 210,
  },
  {
    id: "3",
    name: "Молоко с тростниковым сахаром",
    price: 25,
    image: "/images/products/drink_03.png",
    category: "milk",
    desc: "Ежедневно свежесваренные шарики боба с тростниковым сахаром, классическое молоко, карамельный насыщенный вкус.",
    energy: 450,
    sugar: 35,
    likes: 5600,
    reviews: 450,
  },
  {
    id: "4",
    name: "Грейпфрут",
    price: 22,
    image: "/images/products/drink_04.png",
    category: "fruit",
    desc: "Много мякоти грейпфрута, освежающая основа из жасминового чая, лёгкий освежающий вкус.",
    energy: 180,
    sugar: 15,
    likes: 980,
    reviews: 65,
  },
  {
    id: "5",
    name: "Кокосовый латте",
    price: 26,
    image: "/images/products/drink_05.png",
    category: "coffee",
    desc: "Свежесваренный эспрессо с нежным кокосовым молоком, шелковистая текстура.",
    energy: 210,
    sugar: 8,
    likes: 1500,
    reviews: 120,
  },
];

const DEFAULT_INFLUENCER_DATA: InfluencerData = {
  balance: 3240,
  totalReferrals: 87,
  monthlyReferrals: 23,
  rank: 15,
  activities: [
    {
      id: 1,
      type: "task",
      title: 'Задание выполнено: "Летняя акция"',
      time: "2 часа назад",
      amount: "+₽250.00",
    },
    {
      id: 2,
      type: "referral",
      title: "Новый приглашённый: Anna_K",
      time: "3 часа назад",
      amount: "+₽50.00",
    },
    {
      id: 3,
      type: "task",
      title: 'Задание выполнено: "Продвижение подарочных карт"',
      time: "5 часов назад",
      amount: "+₽180.00",
    },
    {
      id: 4,
      type: "referral",
      title: "Новый приглашённый: Dmitry_V",
      time: "Вчера",
      amount: "+₽50.00",
    },
    {
      id: 5,
      type: "task",
      title: 'Задание выполнено: "Акция повышения уровня"',
      time: "Вчера",
      amount: "+₽300.00",
    },
    {
      id: 6,
      type: "referral",
      title: "Новый приглашённый: Maria_S",
      time: "2 дня назад",
      amount: "+₽50.00",
    },
    {
      id: 7,
      type: "withdraw",
      title: "Вывод обработан",
      time: "5 января 2026",
      amount: "-₽800.00",
    },
    {
      id: 8,
      type: "task",
      title: 'Задание выполнено: "Челлендж рейтинга"',
      time: "3 дня назад",
      amount: "+₽500.00",
    },
    {
      id: 9,
      type: "referral",
      title: "Новый приглашённый: Ivan_P",
      time: "3 дня назад",
      amount: "+₽50.00",
    },
    {
      id: 10,
      type: "task",
      title: 'Задание выполнено: "Репост в соцсетях"',
      time: "4 дня назад",
      amount: "+₽120.00",
    },
    {
      id: 11,
      type: "referral",
      title: "Новый приглашённый: Elena_M",
      time: "5 дней назад",
      amount: "+₽50.00",
    },
    {
      id: 12,
      type: "task",
      title: 'Задание выполнено: "Бонус за отзыв"',
      time: "1 неделю назад",
      amount: "+₽80.00",
    },
  ],
};

const DEFAULT_PROFILE: UserProfile = {
  name: "Участник CHUTEA",
  phone: "138****8888",
  avatar: "",
  level: "Normal",
  totalSpent: 0,
};

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "c1",
    name: "Купон для новых пользователей",
    discount: 5,
    minAmount: 0,
    validUntil: "2025-12-31",
    available: true,
    description: "На весь ассортимент, без ограничений",
  },
  {
    id: "c2",
    name: "Купон на скидку",
    discount: 10,
    minAmount: 50,
    validUntil: "2025-06-30",
    available: true,
    description: "Скидка 10 при заказе от 50",
  },
  {
    id: "c3",
    name: "Эксклюзивный купон для участников",
    discount: 20,
    minAmount: 100,
    validUntil: "2025-08-31",
    available: true,
    description: "Скидка 20 при заказе от 100",
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for LocalStorage
function useStickyState<T>(
  defaultValue: T,
  key: string
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [drinkCart, setDrinkCart] = useStickyState<CartItem[]>(
    [],
    "chutea_drink_cart"
  );
  const [mallCart, setMallCart] = useStickyState<CartItem[]>(
    [],
    "chutea_mall_cart"
  );
  const [orders, setOrders] = useStickyState<Order[]>([], "chutea_orders");
  const [userPoints, setUserPoints] = useStickyState<number>(
    1250,
    "chutea_points"
  );
  const [influencerData, setInfluencerData] = useStickyState<InfluencerData>(
    DEFAULT_INFLUENCER_DATA,
    "chutea_influencer"
  );
  const [userProfile, setUserProfile] = useStickyState<UserProfile>(
    DEFAULT_PROFILE,
    "chutea_profile"
  );
  const [coupons, setCoupons] = useStickyState<Coupon[]>(
    DEFAULT_COUPONS,
    "chutea_coupons"
  );
  const [selectedCouponId, setSelectedCouponId] = useStickyState<string | null>(
    null,
    "chutea_selected_coupon"
  );
  const [city, setCity] = useStickyState<string>("Москва", "chutea_city");
  const [favorites, setFavorites] = useStickyState<FavoriteItem[]>(
    [],
    "chutea_favorites"
  );
  const [reviews, setReviews] = useStickyState<OrderReview[]>(
    [
      {
        id: "r1",
        orderId: "o1",
        rating: 5,
        comment:
          "Виноградный фреш с желе просто супер! Виноград свежий, много мякоти, а желейная текстура — это нечто. Сладость в меру, идеально для лета!",
        images: [
          "/images/reviews/grape_1.jpg",
          "/images/reviews/grape_2.jpg",
          "/images/reviews/grape_3.jpg",
        ],
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: "r2",
        orderId: "o2",
        rating: 5,
        comment:
          "Клубника с сырной пенкой — мой фаворит! Клубника свежая, крем-чиз насыщенный, но не приторный. Очень инстаграмно, рекомендую!",
        images: [
          "/images/reviews/strawberry_1.jpg",
          "/images/reviews/strawberry_2.jpg",
        ],
        createdAt: Date.now() - 86400000 * 5,
      },
      {
        id: "r3",
        orderId: "o3",
        rating: 4,
        comment:
          "Грейпфрут неплохой, очень свежий, но немного кислит. Советую брать стандартный сахар или больше. В целом довольна!",
        images: ["/images/reviews/grapefruit_1.jpg"],
        createdAt: Date.now() - 86400000 * 7,
      },
      {
        id: "r4",
        orderId: "o4",
        rating: 5,
        comment:
          "Молоко с тростниковым сахаром и боба — мой мастхэв! Насыщенный аромат, жемчужины очень упругие. Потрясающее сочетание!",
        images: [
          "/images/reviews/brown_sugar_1.jpg",
          "/images/reviews/brown_sugar_2.jpg",
          "/images/reviews/brown_sugar_3.jpg",
          "/images/reviews/brown_sugar_4.jpg",
        ],
        createdAt: Date.now() - 86400000 * 10,
      },
      {
        id: "r5",
        orderId: "o5",
        rating: 5,
        comment:
          "Кокосовый латте — находка для любителей кофе! Кокос и кофе идеально сочетаются, не горько и не слишком сладко. Бодрит по утрам!",
        images: [
          "/images/reviews/coconut_latte_1.jpg",
          "/images/reviews/coconut_latte_2.jpg",
        ],
        createdAt: Date.now() - 86400000 * 12,
      },
      {
        id: "r6",
        orderId: "o6",
        rating: 4,
        comment:
          "Вкусно, но очередь была слишком длинной. Надеюсь, скорость обслуживания вырастет. В остальном всё отлично!",
        images: [],
        createdAt: Date.now() - 86400000 * 15,
      },
      {
        id: "r7",
        orderId: "o7",
        rating: 5,
        comment:
          "Первый раз попробовала здесь чай — в восторге! Щедрые порции, богатый вкус, разумная цена. Уже мой фаворит, буду приходить часто!",
        images: ["/images/reviews/mix_1.jpg"],
        createdAt: Date.now() - 86400000 * 20,
      },
      {
        id: "r8",
        orderId: "o8",
        rating: 5,
        comment:
          "Красивая упаковка, отлично подходит для подарка. Вкус тоже отличный, друзьям понравилось. Обязательно вернусь!",
        images: ["/images/reviews/gift_1.jpg", "/images/reviews/gift_2.jpg"],
        createdAt: Date.now() - 86400000 * 25,
      },
    ],
    "chutea_reviews_v2"
  );
  const [giftCards, setGiftCards] = useStickyState<GiftCard[]>(
    [],
    "chutea_gift_cards"
  );

  // Database products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Load products from API
  const refreshProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      const response = await fetch("/api/client/products");
      const result = await response.json();

      if (result.success && result.data) {
        setProducts(result.data);
        console.log("✅ [数据库] 已加载", result.data.length, "款产品");
      } else {
        setProductsError("Failed to load products");
        console.error("❌ [数据库] 加载产品失败");
      }
    } catch (error) {
      setProductsError(
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("❌ [数据库] 加载产品出错:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Load products on mount
  useEffect(() => {
    refreshProducts();
  }, []);

  // Drink Cart Actions
  const addToDrinkCart = (item: Partial<CartItem> & { productId: string }) => {
    setDrinkCart(prev => {
      const existing = prev.find(
        i => i.id === item.productId && i.specs === (item.specs || "Стандарт")
      );
      if (existing) {
        return prev.map(i =>
          i.id === item.productId && i.specs === (item.specs || "Стандарт")
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      const product = PRODUCTS.find(p => p.id === item.productId);
      if (!product) return prev;

      return [
        ...prev,
        {
          ...product,
          price: item.price !== undefined ? item.price : product.price, // Использовать传递的价格（包含小料）
          quantity: item.quantity || 1,
          specs: item.specs || "Standard",
          toppings: item.toppings,
        },
      ];
    });
  };

  const updateDrinkCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromDrinkCart(productId);
      return;
    }
    setDrinkCart(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromDrinkCart = (productId: string) => {
    setDrinkCart(prev => prev.filter(i => i.id !== productId));
  };

  const clearDrinkCart = () => setDrinkCart([]);

  // Mall Cart Actions
  const addToMallCart = (item: Partial<CartItem> & { productId: string }) => {
    setMallCart(prev => {
      const existing = prev.find(i => i.id === item.productId);
      if (existing) {
        return prev.map(i =>
          i.id === item.productId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      // Mall products are passed fully in item
      const product = {
        id: item.productId,
        name: item.name!,
        price: item.price!,
        image: item.image!,
        category: "mall",
        desc: item.desc || "",
        energy: 0,
        sugar: 0,
        likes: 0,
        reviews: 0,
      };

      return [
        ...prev,
        { ...product, quantity: item.quantity || 1, specs: "Standard" },
      ];
    });
  };

  const updateMallCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromMallCart(productId);
      return;
    }
    setMallCart(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromMallCart = (productId: string) => {
    setMallCart(prev => prev.filter(i => i.id !== productId));
  };

  const clearMallCart = () => setMallCart([]);

  const deductPoints = (amount: number) => {
    setUserPoints(prev => Math.max(0, prev - amount));
  };

  const addOrder = (
    order: Omit<Order, "id" | "date" | "createdAt" | "pickupCode">
  ) => {
    // 生成Код получения：T + 4 человек数字
    const pickupCode = `T${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newOrder: Order = {
      ...order,
      id: `order_${Date.now()}`,
      date: new Date().toLocaleDateString("zh-CN"),
      createdAt: Date.now(),
      pickupCode,
    };
    setOrders(prev => [newOrder, ...prev]);

    // 更新累计消费并检查会员等级升级
    const newTotalSpent = userProfile.totalSpent + order.total;
    checkAndUpgradeMemberLevel(newTotalSpent);

    return newOrder;
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const withdrawFunds = () => {
    if (influencerData.balance <= 0) return;
    const amount = influencerData.balance;
    setInfluencerData(prev => ({
      ...prev,
      balance: 0,
      activities: [
        {
          id: Date.now(),
          type: "withdraw",
          title: "Заявка на вывод отправлена",
          time: "Только что",
          amount: `-${formatCurrency(amount.toFixed(2))}`,
        },
        ...prev.activities,
      ],
    }));
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => [coupon, ...prev]);
  };

  const useCoupon = (id: string) => {
    setCoupons(prev =>
      prev.map(c => (c.id === id ? { ...c, status: "used" } : c))
    );
  };

  const addToFavorites = (item: FavoriteItem) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev;
      return [item, ...prev];
    });
  };

  const removeFromFavorites = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const isFavorite = (id: string) => {
    return favorites.some(f => f.id === id);
  };

  const addReview = (
    orderId: string,
    rating: number,
    comment: string,
    images?: string[]
  ) => {
    const newReview: OrderReview = {
      id: `review_${Date.now()}`,
      orderId,
      rating,
      comment,
      images: images || [],
      createdAt: Date.now(),
    };

    setReviews(prev => [...prev, newReview]);
  };

  // 礼品卡方法
  const purchaseGiftCard = (amount: number): GiftCard => {
    const code = `GC${Date.now().toString().slice(-8)}`;
    const newCard: GiftCard = {
      id: `card_${Date.now()}`,
      code,
      balance: amount,
      initialAmount: amount,
      status: "active",
      purchasedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1г.有效期
      transactions: [
        {
          id: `tx_${Date.now()}`,
          amount: amount,
          type: "purchase",
          createdAt: Date.now(),
          description: `Покупка подарочной карты ${formatCurrency(amount)}`,
        },
      ],
    };

    setGiftCards(prev => [...prev, newCard]);
    return newCard;
  };

  const transferGiftCard = (cardId: string, to: string, message?: string) => {
    setGiftCards(prev =>
      prev.map(card =>
        card.id === cardId
          ? { ...card, to, message, from: userProfile.name }
          : card
      )
    );
  };

  const useGiftCard = (
    cardId: string,
    amount: number,
    orderId: string
  ): boolean => {
    const card = giftCards.find(c => c.id === cardId);
    if (!card || card.balance < amount || card.status !== "active") {
      return false;
    }

    const newBalance = card.balance - amount;
    const transaction: GiftCardTransaction = {
      id: `tx_${Date.now()}`,
      amount: -amount,
      type: "use",
      orderId,
      createdAt: Date.now(),
      description: `Оплата заказа #${orderId.slice(0, 8)}`,
    };

    setGiftCards(prev =>
      prev.map(card =>
        card.id === cardId
          ? {
              ...card,
              balance: newBalance,
              status: newBalance === 0 ? "used" : "active",
              transactions: [...card.transactions, transaction],
            }
          : card
      )
    );

    return true;
  };

  const getGiftCardBalance = (cardId: string): number => {
    const card = giftCards.find(c => c.id === cardId);
    return card ? card.balance : 0;
  };

  // 会员等级自动升级逻辑
  const checkAndUpgradeMemberLevel = (newTotalSpent: number) => {
    let newLevel: UserProfile["level"] = "Normal";

    if (newTotalSpent >= MEMBER_LEVELS.Platinum.threshold) {
      newLevel = "Platinum";
    } else if (newTotalSpent >= MEMBER_LEVELS.Gold.threshold) {
      newLevel = "Gold";
    } else if (newTotalSpent >= MEMBER_LEVELS.Silver.threshold) {
      newLevel = "Silver";
    }

    const oldLevel = userProfile.level;
    if (newLevel !== oldLevel) {
      setUserProfile(prev => ({
        ...prev,
        level: newLevel,
        totalSpent: newTotalSpent,
      }));

      // 赠送升级Скидка券
      const upgradeDiscount =
        newLevel === "Platinum" ? 50 : newLevel === "Gold" ? 30 : 20;
      const upgradeCoupon: Coupon = {
        id: `upgrade_${Date.now()}`,
        name: `Подарок за повышение ${MEMBER_LEVELS[newLevel].name}`,
        discount: upgradeDiscount,
        minAmount: 0,
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toLocaleDateString("zh-CN"),
        available: true,
        description: "Поздравляем с повышением, эксклюзивный купон",
      };
      addCoupon(upgradeCoupon);

      // 触发升级动画（通过事шт系统）
      window.dispatchEvent(
        new CustomEvent("membershipUpgrade", { detail: { newLevel } })
      );

      setTimeout(() => {}, 500);
    } else {
      setUserProfile(prev => ({ ...prev, totalSpent: newTotalSpent }));
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    window.location.reload();
  };

  // 初始化 reviews 数据（如果为空）
  useEffect(() => {
    if (reviews.length === 0) {
      const defaultReviews: OrderReview[] = [
        {
          id: "r1",
          orderId: "o1",
          rating: 5,
          comment:
            "Виноградный фреш с желе просто супер! Виноград свежий, много мякоти, а желейная текстура — это нечто. Сладость в меру, идеально для лета!",
          images: [
            "/images/reviews/grape_1.jpg",
            "/images/reviews/grape_2.jpg",
            "/images/reviews/grape_3.jpg",
          ],
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          id: "r2",
          orderId: "o2",
          rating: 5,
          comment:
            "Клубника с сырной пенкой — мой фаворит! Клубника свежая, крем-чиз насыщенный, но не приторный. Очень инстаграмно, рекомендую!",
          images: [
            "/images/reviews/strawberry_1.jpg",
            "/images/reviews/strawberry_2.jpg",
          ],
          createdAt: Date.now() - 86400000 * 5,
        },
        {
          id: "r3",
          orderId: "o3",
          rating: 4,
          comment:
            "Грейпфрут неплохой, очень свежий, но немного кислит. Советую брать стандартный сахар или больше. В целом довольна!",
          images: ["/images/reviews/grapefruit_1.jpg"],
          createdAt: Date.now() - 86400000 * 7,
        },
        {
          id: "r4",
          orderId: "o4",
          rating: 5,
          comment:
            "Молоко с тростниковым сахаром и боба — мой мастхэв! Насыщенный аромат, жемчужины очень упругие. Потрясающее сочетание!",
          images: [
            "/images/reviews/brown_sugar_1.jpg",
            "/images/reviews/brown_sugar_2.jpg",
            "/images/reviews/brown_sugar_3.jpg",
            "/images/reviews/brown_sugar_4.jpg",
          ],
          createdAt: Date.now() - 86400000 * 10,
        },
        {
          id: "r5",
          orderId: "o5",
          rating: 5,
          comment:
            "Кокосовый латте — находка для любителей кофе! Кокос и кофе идеально сочетаются, не горько и не слишком сладко. Бодрит по утрам!",
          images: [
            "/images/reviews/coconut_latte_1.jpg",
            "/images/reviews/coconut_latte_2.jpg",
          ],
          createdAt: Date.now() - 86400000 * 12,
        },
        {
          id: "r6",
          orderId: "o6",
          rating: 4,
          comment:
            "Вкусно, но очередь была слишком длинной. Надеюсь, скорость обслуживания вырастет. В остальном всё отлично!",
          images: [],
          createdAt: Date.now() - 86400000 * 15,
        },
        {
          id: "r7",
          orderId: "o7",
          rating: 5,
          comment:
            "Первый раз попробовала здесь чай — в восторге! Щедрые порции, богатый вкус, разумная цена. Уже мой фаворит, буду приходить часто!",
          images: ["/images/reviews/mix_1.jpg"],
          createdAt: Date.now() - 86400000 * 20,
        },
        {
          id: "r8",
          orderId: "o8",
          rating: 5,
          comment:
            "Красивая упаковка, отлично подходит для подарка. Вкус тоже отличный, друзьям понравилось. Обязательно вернусь!",
          images: ["/images/reviews/gift_1.jpg", "/images/reviews/gift_2.jpg"],
          createdAt: Date.now() - 86400000 * 25,
        },
      ];
      setReviews(defaultReviews);
    }
  }, []); // 只在组шт挂载时执行一次

  const drinkCartTotal = drinkCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const drinkCartCount = drinkCart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const mallCartTotal = mallCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const mallCartCount = mallCart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        drinkCart,
        mallCart,
        orders,
        userPoints,
        influencerData,
        userProfile,
        coupons,
        selectedCouponId,
        city,
        favorites,
        giftCards,
        reviews,
        products,
        isLoadingProducts,
        productsError,
        setCity,
        addToDrinkCart,
        updateDrinkCartQuantity,
        removeFromDrinkCart,
        clearDrinkCart,
        addToMallCart,
        updateMallCartQuantity,
        removeFromMallCart,
        clearMallCart,
        deductPoints,
        addOrder,
        cancelOrder,
        withdrawFunds,
        updateProfile,
        addCoupon,
        useCoupon,
        selectCoupon: setSelectedCouponId,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        addReview,
        refreshProducts,
        purchaseGiftCard,
        transferGiftCard,
        useGiftCard,
        getGiftCardBalance,
        resetAllData,
        drinkCartTotal,
        drinkCartCount,
        mallCartTotal,
        mallCartCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
