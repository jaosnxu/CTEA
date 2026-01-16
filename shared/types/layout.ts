/**
 * SDUI 布局配置系统类型定义
 * 支持动态页面布局配置
 */

// 组件类型枚举
export type ComponentType =
  | "banner"
  | "product-block"
  | "category-nav"
  | "text-block"
  | "image-block"
  | "divider"
  | "spacer";

// 页面类型
export type PageType = "home" | "order" | "mall";

// 多语言文本
export interface I18nText {
  zh?: string;
  ru?: string;
  en?: string;
}

// Banner 组件配置
export interface BannerProps {
  images: Array<{
    url: string;
    link?: string;
    alt?: I18nText;
  }>;
  autoPlay?: boolean;
  interval?: number; // 自动播放间隔（毫秒）
  height?: number; // 高度（像素）
}

// 商品区块配置
export interface ProductBlockProps {
  title?: I18nText;
  productIds?: string[]; // 商品ID列表
  categoryId?: string; // 分类ID
  layout?: "grid" | "list" | "carousel"; // 布局方式
  limit?: number; // 显示数量
  showPrice?: boolean;
  showAddToCart?: boolean;
}

// 分类导航配置
export interface CategoryNavProps {
  categories: Array<{
    id: string;
    name: I18nText;
    icon?: string;
    link?: string;
  }>;
  layout?: "grid" | "horizontal-scroll"; // 布局方式
  columns?: number; // 网格列数
}

// 文字块配置
export interface TextBlockProps {
  content: I18nText;
  align?: "left" | "center" | "right";
  fontSize?: "sm" | "base" | "lg" | "xl";
  fontWeight?: "normal" | "medium" | "bold";
  color?: string;
  backgroundColor?: string;
  padding?: number;
}

// 图片块配置
export interface ImageBlockProps {
  url: string;
  link?: string;
  alt?: I18nText;
  aspectRatio?: string; // 例如 "16:9", "1:1"
  objectFit?: "cover" | "contain" | "fill";
}

// 分隔线配置
export interface DividerProps {
  thickness?: number;
  color?: string;
  margin?: number;
}

// 间隔器配置
export interface SpacerProps {
  height: number; // 高度（像素）
}

// 组件配置联合类型
export type ComponentProps =
  | BannerProps
  | ProductBlockProps
  | CategoryNavProps
  | TextBlockProps
  | ImageBlockProps
  | DividerProps
  | SpacerProps;

// 组件定义
export interface LayoutComponent {
  id: string; // 组件唯一标识
  type: ComponentType;
  props: ComponentProps;
  visible?: boolean; // 是否显示
  order?: number; // 排序
}

// 页面布局配置
export interface PageLayoutConfig {
  page: PageType;
  blocks: LayoutComponent[];
  meta?: {
    title?: I18nText;
    description?: I18nText;
  };
}

// 布局配置历史记录
export interface LayoutConfigHistory {
  id: number;
  page: PageType;
  config: PageLayoutConfig;
  version: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 默认配置
export const DEFAULT_HOME_LAYOUT: PageLayoutConfig = {
  page: "home",
  blocks: [
    {
      id: "banner-1",
      type: "banner",
      props: {
        images: [
          {
            url: "/placeholder-banner.jpg",
            alt: {
              zh: "欢迎横幅",
              ru: "Приветственный баннер",
              en: "Welcome Banner",
            },
          },
        ],
        autoPlay: true,
        interval: 5000,
        height: 200,
      },
      visible: true,
      order: 1,
    },
    {
      id: "category-nav-1",
      type: "category-nav",
      props: {
        categories: [
          {
            id: "tea",
            name: {
              zh: "茶饮",
              ru: "Чай",
              en: "Tea",
            },
            icon: "☕",
          },
          {
            id: "coffee",
            name: {
              zh: "咖啡",
              ru: "Кофе",
              en: "Coffee",
            },
            icon: "☕",
          },
        ],
        layout: "grid",
        columns: 4,
      },
      visible: true,
      order: 2,
    },
    {
      id: "product-block-1",
      type: "product-block",
      props: {
        title: {
          zh: "热门商品",
          ru: "Популярные товары",
          en: "Popular Products",
        },
        layout: "grid",
        limit: 8,
        showPrice: true,
        showAddToCart: true,
      },
      visible: true,
      order: 3,
    },
  ],
  meta: {
    title: {
      zh: "首页",
      ru: "Главная",
      en: "Home",
    },
  },
};

export const DEFAULT_ORDER_LAYOUT: PageLayoutConfig = {
  page: "order",
  blocks: [
    {
      id: "text-block-1",
      type: "text-block",
      props: {
        content: {
          zh: "开始您的订单",
          ru: "Начните свой заказ",
          en: "Start Your Order",
        },
        align: "center",
        fontSize: "xl",
        fontWeight: "bold",
        padding: 16,
      },
      visible: true,
      order: 1,
    },
    {
      id: "product-block-1",
      type: "product-block",
      props: {
        title: {
          zh: "所有商品",
          ru: "Все товары",
          en: "All Products",
        },
        layout: "list",
        showPrice: true,
        showAddToCart: true,
      },
      visible: true,
      order: 2,
    },
  ],
  meta: {
    title: {
      zh: "下单",
      ru: "Заказ",
      en: "Order",
    },
  },
};

export const DEFAULT_MALL_LAYOUT: PageLayoutConfig = {
  page: "mall",
  blocks: [
    {
      id: "banner-1",
      type: "banner",
      props: {
        images: [
          {
            url: "/placeholder-mall-banner.jpg",
            alt: {
              zh: "商城横幅",
              ru: "Баннер магазина",
              en: "Mall Banner",
            },
          },
        ],
        autoPlay: true,
        interval: 4000,
        height: 180,
      },
      visible: true,
      order: 1,
    },
    {
      id: "product-block-1",
      type: "product-block",
      props: {
        title: {
          zh: "商城商品",
          ru: "Товары магазина",
          en: "Mall Products",
        },
        layout: "grid",
        showPrice: true,
        showAddToCart: true,
      },
      visible: true,
      order: 2,
    },
  ],
  meta: {
    title: {
      zh: "商城",
      ru: "Магазин",
      en: "Mall",
    },
  },
};
