
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
        wallet: "Wallet"
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
        wallet: "钱包"
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
        wallet: "Кошелек"
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
