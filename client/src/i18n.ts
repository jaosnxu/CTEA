
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      brand: "CHU TEA",
      nav: {
        home: "Home",
        order: "Order",
        mall: "Mall",
        orders: "Orders",
        profile: "Profile"
      },
      home: {
        pickup: "Pick Up",
        delivery: "Delivery",
        pickup_desc: "Order ahead, no queue",
        delivery_desc: "Fresh to your door",
        unlock_vip: "Unlock free delivery with 1 more order",
        gift_card: "Gift Card",
        group_order: "Group Order",
        wallet: "Wallet",
        hero_title: "Strawberry Cheezo",
        hero_desc: "Fresh strawberries, jasmine tea, cheese foam.",
        member_level: "Tea Lover",
        gift_card_desc: "Send love",
        group_order_desc: "Office party",
        wallet_desc: "Top up",
        tags: {
          new_arrival: "New Arrival",
          seasonal: "Seasonal",
          best_seller: "Best Seller"
        }
      },
      order: {
        search_placeholder: "Search drinks...",
        pickup_toggle: "Pickup",
        delivery_toggle: "Delivery",
        add_to_cart: "Add to Cart",
        checkout: "Checkout",
        total: "Total",
        base_price: "Base price",
        size: "SIZE",
        sugar: "SUGAR",
        toppings: "TOPPINGS",
        select: "Select",
        sold_out: "Sold Out"
      },
      profile: {
        coupons: "Coupons",
        points: "Points",
        current_level: "Current Level",
        upgrade_tip: "Upgrade to VIP.2 with 30 more points",
        my_addresses: "My Addresses",
        my_coupons: "My Coupons",
        payment_methods: "Payment Methods",
        language: "Language / Язык",
        kol_center: "KOL Center",
        notifications: "Notifications",
        help_support: "Help & Support"
      },
      categories: {
        seasonal: "Seasonal",
        top_picks: "Top Picks",
        milktea: "Milk Tea",
        fruit_tea: "Fruit Tea",
        slush: "Slush",
        puretea: "Pure Tea",
        coffee: "Coffee",
        bakery: "Bakery"
      }
    }
  },
  zh: {
    translation: {
      brand: "CHU TEA",
      nav: {
        home: "首页",
        order: "点单",
        mall: "百货",
        orders: "订单",
        profile: "我的"
      },
      home: {
        pickup: "门店自取",
        delivery: "外卖",
        pickup_desc: "下单免排队",
        delivery_desc: "无接触配送，送喜到家",
        unlock_vip: "再消费1单解锁免配送费特权",
        gift_card: "礼品卡",
        group_order: "企业团餐",
        wallet: "钱包",
        hero_title: "芝芝莓莓",
        hero_desc: "新鲜草莓，茉莉茶底，芝士奶盖。",
        member_level: "喜茶仁",
        gift_card_desc: "送出心意",
        group_order_desc: "公司聚餐",
        wallet_desc: "充值有礼",
        tags: {
          new_arrival: "新品推荐",
          seasonal: "当季限定",
          best_seller: "人气热销"
        }
      },
      order: {
        search_placeholder: "搜索饮品...",
        pickup_toggle: "自取",
        delivery_toggle: "外卖",
        add_to_cart: "加入购物袋",
        checkout: "去结算",
        total: "合计",
        base_price: "基础价",
        size: "规格",
        sugar: "甜度",
        toppings: "加料",
        select: "选规格",
        sold_out: "售罄"
      },
      profile: {
        coupons: "优惠券",
        points: "积分",
        current_level: "当前等级",
        upgrade_tip: "再积30分升级为VIP.2",
        my_addresses: "我的地址",
        my_coupons: "我的优惠券",
        payment_methods: "支付方式",
        language: "语言 / Language",
        kol_center: "达人中心",
        notifications: "消息通知",
        help_support: "帮助与支持"
      },
      categories: {
        seasonal: "时令鲜果",
        top_picks: "灵感上新",
        milktea: "清爽不喝腻",
        fruit_tea: "经典不踩雷",
        slush: "冰沙",
        puretea: "平价推荐",
        coffee: "要浓郁",
        bakery: "要简单"
      }
    }
  },
  ru: {
    translation: {
      brand: "CHU TEA",
      nav: {
        home: "Главная",
        order: "Меню",
        mall: "Маркет",
        orders: "Заказы",
        profile: "Профиль"
      },
      home: {
        pickup: "Самовывоз",
        delivery: "Доставка",
        pickup_desc: "Заказ заранее, без очереди",
        delivery_desc: "Свежесть до вашей двери",
        unlock_vip: "Бесплатная доставка через 1 заказ",
        gift_card: "Подарочная карта",
        group_order: "Групповой заказ",
        wallet: "Кошелек",
        hero_title: "Клубничный Чиз",
        hero_desc: "Свежая клубника, жасминовый чай, сырная пенка.",
        member_level: "Любитель Чая",
        gift_card_desc: "Подарить",
        group_order_desc: "Для офиса",
        wallet_desc: "Пополнить",
        tags: {
          new_arrival: "Новинки",
          seasonal: "Сезонное",
          best_seller: "Хиты"
        }
      },
      order: {
        search_placeholder: "Поиск напитков...",
        pickup_toggle: "Самовывоз",
        delivery_toggle: "Доставка",
        add_to_cart: "В корзину",
        checkout: "Оформить",
        total: "Итого",
        base_price: "Базовая цена",
        size: "РАЗМЕР",
        sugar: "САХАР",
        toppings: "ТОППИНГИ",
        select: "Выбрать",
        sold_out: "Продано"
      },
      profile: {
        coupons: "Купоны",
        points: "Баллы",
        current_level: "Текущий уровень",
        upgrade_tip: "До VIP.2 осталось 30 баллов",
        my_addresses: "Мои адреса",
        my_coupons: "Мои купоны",
        payment_methods: "Способы оплаты",
        language: "Язык / Language",
        kol_center: "Партнерская программа",
        notifications: "Уведомления",
        help_support: "Помощь"
      },
      categories: {
        seasonal: "Сезонное",
        top_picks: "Хиты",
        milktea: "Молочный чай",
        fruit_tea: "Фруктовый чай",
        slush: "Слаш",
        puretea: "Чистый чай",
        coffee: "Кофе",
        bakery: "Выпечка"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // 强制默认为俄语
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
