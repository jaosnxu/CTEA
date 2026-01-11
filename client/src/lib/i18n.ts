/**
 * 国际化工具函数
 * 支持中文、俄语、英语三语切换
 */

export type Language = 'zh' | 'ru' | 'en';

// 默认语言：俄语
export const DEFAULT_LANGUAGE: Language = 'ru';

// 货币符号：卢布
export const CURRENCY_SYMBOL = '₽';

/**
 * 根据语言返回合适的字体大小类名
 * 俄语文字通常比中文长，需要更小的字体
 */
export function getAdaptiveFontSize(baseSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl', language: Language = DEFAULT_LANGUAGE): string {
  const fontSizeMap = {
    zh: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
    ru: {
      xs: 'text-[10px]',
      sm: 'text-[12px]',
      base: 'text-[14px]',
      lg: 'text-[16px]',
      xl: 'text-[18px]',
      '2xl': 'text-[20px]',
    },
    en: {
      xs: 'text-[11px]',
      sm: 'text-[13px]',
      base: 'text-[15px]',
      lg: 'text-[17px]',
      xl: 'text-[19px]',
      '2xl': 'text-[21px]',
    },
  };

  return fontSizeMap[language][baseSize];
}

/**
 * 格式化货币显示（卢布）
 */
export function formatCurrency(amount: number | string | undefined, language: Language = DEFAULT_LANGUAGE): string {
  // 处理 undefined 和空值
  if (amount === undefined || amount === null || amount === '') {
    return `0 ${CURRENCY_SYMBOL}`;
  }
  
  // 将字符串转换为数字
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // 处理 NaN
  if (isNaN(numAmount)) {
    return `0 ${CURRENCY_SYMBOL}`;
  }
  const formatted = numAmount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatted} ${CURRENCY_SYMBOL}`;
}

/**
 * 翻译文本
 */
export interface TranslationMap {
  zh: string;
  ru: string;
  en: string;
}

export function t(translations: TranslationMap, language: Language = DEFAULT_LANGUAGE): string {
  return translations[language];
}

/**
 * 常用翻译
 */
/**
 * 俄语复数规则函数
 * 俄语复数规则：
 * - 1, 21, 31... (个位为1，但不是11) → 单数形式 (1 товар)
 * - 2-4, 22-24, 32-34... (个位为2-4，但不是12-14) → 少数复数形式 (2 товара)
 * - 0, 5-20, 25-30... (其他情况) → 多数复数形式 (5 товаров)
 * 
 * @param count - 数量
 * @param one - 单数形式 (如: товар, штука, балл)
 * @param few - 少数复数形式 (如: товара, штуки, балла)
 * @param many - 多数复数形式 (如: товаров, штук, баллов)
 * @returns 正确的复数形式字符串
 * 
 * @example
 * russianPlural(1, 'товар', 'товара', 'товаров') // "1 товар"
 * russianPlural(2, 'товар', 'товара', 'товаров') // "2 товара"
 * russianPlural(5, 'товар', 'товара', 'товаров') // "5 товаров"
 * russianPlural(21, 'штука', 'штуки', 'штук') // "21 штука"
 */
export function russianPlural(count: number, one: string, few: string, many: string): string {
  const absCount = Math.abs(count);
  const lastTwo = absCount % 100;
  const lastOne = absCount % 10;
  
  let form: string;
  
  // 特殊情况：11-14 总是使用 many 形式
  if (lastTwo >= 11 && lastTwo <= 14) {
    form = many;
  }
  // 个位为 1 → 单数
  else if (lastOne === 1) {
    form = one;
  }
  // 个位为 2-4 → 少数复数
  else if (lastOne >= 2 && lastOne <= 4) {
    form = few;
  }
  // 其他情况 → 多数复数
  else {
    form = many;
  }
  
  return `${count} ${form}`;
}

/**
 * 俄语复数规则预设配置
 * 常用名词的三种复数形式
 */
export const russianPluralForms = {
  // 商品
  item: { one: 'товар', few: 'товара', many: 'товаров' },
  // 件/个
  piece: { one: 'штука', few: 'штуки', many: 'штук' },
  // 积分
  point: { one: 'балл', few: 'балла', many: 'баллов' },
  // 卷
  coupon: { one: 'купон', few: 'купона', many: 'купонов' },
  // 评价
  review: { one: 'отзыв', few: 'отзыва', many: 'отзывов' },
  // 分钟
  minute: { one: 'минута', few: 'минуты', many: 'минут' },
  // 小时
  hour: { one: 'час', few: 'часа', many: 'часов' },
  // 天
  day: { one: 'день', few: 'дня', many: 'дней' },
  // 人
  person: { one: 'человек', few: 'человека', many: 'человек' },
  // 店铺
  store: { one: 'магазин', few: 'магазина', many: 'магазинов' },
  // 订单
  order: { one: 'заказ', few: 'заказа', many: 'заказов' },
  // 卡路里
  calorie: { one: 'калория', few: 'калории', many: 'калорий' },
  // 元/卢布
  ruble: { one: 'рубль', few: 'рубля', many: 'рублей' },
};

/**
 * 便捷函数：使用预设配置生成复数文本
 * @param count - 数量
 * @param type - 预设类型
 * @returns 带正确复数形式的文本
 * 
 * @example
 * pluralize(1, 'item') // "1 товар"
 * pluralize(3, 'point') // "3 балла"
 * pluralize(5, 'coupon') // "5 купонов"
 */
export function pluralize(count: number, type: keyof typeof russianPluralForms): string {
  const forms = russianPluralForms[type];
  return russianPlural(count, forms.one, forms.few, forms.many);
}

/**
 * 常用翻译
 */
export const translations = {
  // 底部导航
  home: { zh: '首页', ru: 'Главная', en: 'Home' },
  order: { zh: '点单', ru: 'Заказ', en: 'Order' },
  mall: { zh: '商城', ru: 'Магазин', en: 'Mall' },
  orders: { zh: '订单', ru: 'Заказы', en: 'Orders' },
  profile: { zh: '我的', ru: 'Профиль', en: 'Profile' },

  // 按钮
  confirm: { zh: '确认', ru: 'Подтвердить', en: 'Confirm' },
  cancel: { zh: '取消', ru: 'Отменить', en: 'Cancel' },
  submit: { zh: '提交', ru: 'Отправить', en: 'Submit' },
  back: { zh: '返回', ru: 'Назад', en: 'Back' },
  next: { zh: '下一步', ru: 'Далее', en: 'Next' },
  save: { zh: '保存', ru: 'Сохранить', en: 'Save' },
  delete: { zh: '删除', ru: 'Удалить', en: 'Delete' },
  edit: { zh: '编辑', ru: 'Редактировать', en: 'Edit' },

  // 订单状态
  pending: { zh: '待制作', ru: 'Ожидание', en: 'Pending' },
  preparing: { zh: '制作中', ru: 'Готовится', en: 'Preparing' },
  ready: { zh: '待取货', ru: 'Готов', en: 'Ready' },
  completed: { zh: '已完成', ru: 'Завершен', en: 'Completed' },
  cancelled: { zh: '已取消', ru: 'Отменен', en: 'Cancelled' },

  // 支付
  pay: { zh: '支付', ru: 'Оплатить', en: 'Pay' },
  payNow: { zh: '立即支付', ru: 'Оплатить сейчас', en: 'Pay Now' },
  total: { zh: '总计', ru: 'Итого', en: 'Total' },
  subtotal: { zh: '小计', ru: 'Промежуточный итог', en: 'Subtotal' },
  discount: { zh: '优惠', ru: 'Скидка', en: 'Discount' },

  // 商品
  addToCart: { zh: '加入购物车', ru: 'В корзину', en: 'Add to Cart' },
  buyNow: { zh: '立即购买', ru: 'Купить сейчас', en: 'Buy Now' },
  outOfStock: { zh: '已售罄', ru: 'Нет в наличии', en: 'Out of Stock' },
  inStock: { zh: '有货', ru: 'В наличии', en: 'In Stock' },

  // 用户
  login: { zh: '登录', ru: 'Войти', en: 'Login' },
  logout: { zh: '退出', ru: 'Выйти', en: 'Logout' },
  register: { zh: '注册', ru: 'Регистрация', en: 'Register' },
  myProfile: { zh: '我的资料', ru: 'Мой профиль', en: 'My Profile' },

  // 其他
  loading: { zh: '加载中...', ru: 'Загрузка...', en: 'Loading...' },
  error: { zh: '错误', ru: 'Ошибка', en: 'Error' },
  success: { zh: '成功', ru: 'Успех', en: 'Success' },
  noData: { zh: '暂无数据', ru: 'Нет данных', en: 'No Data' },
};
