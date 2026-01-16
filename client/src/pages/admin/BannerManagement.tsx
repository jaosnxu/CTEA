/**
 * CHUTEA 智慧中台 - Banner 管理
 *
 * 功能：
 * 1. Banner 列表展示
 * 2. 图片/视频上传
 * 3. 跳转链接配置
 * 4. 生效时间设置
 * 5. 排序管理
 */

import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Image,
  Video,
  Link,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MultiLangText {
  ru: string;
  zh: string;
  en?: string;
}

interface Banner {
  id: string;
  title: MultiLangText;
  type: "IMAGE" | "VIDEO";
  mediaUrl: string;
  linkUrl?: string;
  linkType: "INTERNAL" | "EXTERNAL" | "NONE";
  position: "HOME_TOP" | "HOME_MIDDLE" | "CATEGORY" | "PRODUCT";
  sortOrder: number;
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

// ==================== 语言配置 ====================

const translations = {
  ru: {
    title: "Управление баннерами",
    subtitle: "Настройка рекламных баннеров",
    banner: {
      title: "Заголовок",
      titleRu: "Заголовок (RU)",
      titleZh: "Заголовок (ZH)",
      type: "Тип",
      image: "Изображение",
      video: "Видео",
      mediaUrl: "URL медиа",
      linkUrl: "URL ссылки",
      linkType: "Тип ссылки",
      internal: "Внутренняя",
      external: "Внешняя",
      none: "Без ссылки",
      position: "Позиция",
      positions: {
        HOME_TOP: "Главная (верх)",
        HOME_MIDDLE: "Главная (середина)",
        CATEGORY: "Категория",
        PRODUCT: "Товар",
      },
      order: "Порядок",
      status: "Статус",
      active: "Активен",
      inactive: "Неактивен",
      startTime: "Начало показа",
      endTime: "Конец показа",
      preview: "Предпросмотр",
    },
    actions: {
      add: "Добавить баннер",
      edit: "Редактировать",
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      moveUp: "Вверх",
      moveDown: "Вниз",
    },
    messages: {
      saved: "Сохранено успешно",
      deleted: "Удалено успешно",
      error: "Ошибка",
      loading: "Загрузка...",
      noData: "Нет баннеров",
      confirmDelete: "Удалить баннер?",
    },
    filter: {
      all: "Все",
      active: "Активные",
      scheduled: "Запланированные",
      expired: "Истекшие",
    },
  },
  zh: {
    title: "Banner 管理",
    subtitle: "配置广告横幅",
    banner: {
      title: "标题",
      titleRu: "标题 (俄语)",
      titleZh: "标题 (中文)",
      type: "类型",
      image: "图片",
      video: "视频",
      mediaUrl: "媒体 URL",
      linkUrl: "链接 URL",
      linkType: "链接类型",
      internal: "内部链接",
      external: "外部链接",
      none: "无链接",
      position: "位置",
      positions: {
        HOME_TOP: "首页顶部",
        HOME_MIDDLE: "首页中部",
        CATEGORY: "分类页",
        PRODUCT: "产品页",
      },
      order: "排序",
      status: "状态",
      active: "启用",
      inactive: "停用",
      startTime: "开始时间",
      endTime: "结束时间",
      preview: "预览",
    },
    actions: {
      add: "添加 Banner",
      edit: "编辑",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      moveUp: "上移",
      moveDown: "下移",
    },
    messages: {
      saved: "保存成功",
      deleted: "删除成功",
      error: "错误",
      loading: "加载中...",
      noData: "暂无 Banner",
      confirmDelete: "确定删除该 Banner？",
    },
    filter: {
      all: "全部",
      active: "已启用",
      scheduled: "已计划",
      expired: "已过期",
    },
  },
};

// ==================== 主组件 ====================

export default function BannerManagement() {
  const [lang, setLang] = useState<"ru" | "zh">("ru");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "scheduled" | "expired"
  >("all");

  // 编辑状态
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);

  const t = translations[lang];

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/banner.list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.result?.data) {
        setBanners(data.result.data);
      }
    } catch (error) {
      console.error("Failed to load banners:", error);
      // 使用模拟数据
      setBanners([
        {
          id: "1",
          title: { ru: "Новогодняя акция", zh: "新年活动" },
          type: "IMAGE",
          mediaUrl: "https://picsum.photos/800/300?random=1",
          linkUrl: "/activity-center",
          linkType: "INTERNAL",
          position: "HOME_TOP",
          sortOrder: 1,
          isActive: true,
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-31T23:59:59Z",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          title: { ru: "Купи 1 получи 1", zh: "买一送一" },
          type: "IMAGE",
          mediaUrl: "https://picsum.photos/800/300?random=2",
          linkUrl: "/flash-sale",
          linkType: "INTERNAL",
          position: "HOME_TOP",
          sortOrder: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 保存 Banner
  const saveBanner = async (banner: Banner) => {
    try {
      const isNew = !banner.id || banner.id.startsWith("new-");
      const endpoint = isNew
        ? "/api/trpc/banner.create"
        : "/api/trpc/banner.update";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(banner),
      });

      const data = await res.json();
      if (data.result?.data) {
        if (isNew) {
          setBanners([...banners, data.result.data]);
        } else {
          setBanners(
            banners.map(b => (b.id === banner.id ? data.result.data : b))
          );
        }
        showMessage("success", t.messages.saved);
      }
    } catch (error) {
      // 本地更新
      if (!banner.id || banner.id.startsWith("new-")) {
        const newBanner = {
          ...banner,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setBanners([...banners, newBanner]);
      } else {
        setBanners(banners.map(b => (b.id === banner.id ? banner : b)));
      }
      showMessage("success", t.messages.saved);
    }
    setEditingBanner(null);
    setShowForm(false);
  };

  // 删除 Banner
  const deleteBanner = async (id: string) => {
    if (!confirm(t.messages.confirmDelete)) return;

    try {
      await fetch("/api/trpc/banner.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setBanners(banners.filter(b => b.id !== id));
    showMessage("success", t.messages.deleted);
  };

  // 移动排序
  const moveBanner = (id: string, direction: "up" | "down") => {
    const index = banners.findIndex(b => b.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === banners.length - 1)
    ) {
      return;
    }

    const newBanners = [...banners];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newBanners[index], newBanners[swapIndex]] = [
      newBanners[swapIndex],
      newBanners[index],
    ];

    // 更新排序值
    newBanners.forEach((b, i) => {
      b.sortOrder = i + 1;
    });

    setBanners(newBanners);
  };

  // 切换状态
  const toggleActive = (id: string) => {
    setBanners(
      banners.map(b => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  // 过滤 Banner
  const filteredBanners = banners.filter(b => {
    const now = new Date();
    const start = b.startTime ? new Date(b.startTime) : null;
    const end = b.endTime ? new Date(b.endTime) : null;

    switch (filter) {
      case "active":
        return b.isActive && (!start || start <= now) && (!end || end >= now);
      case "scheduled":
        return start && start > now;
      case "expired":
        return end && end < now;
      default:
        return true;
    }
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString(lang === "ru" ? "ru-RU" : "zh-CN");
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🖼️ {t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === "ru" ? "zh" : "ru")}
              className="px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              {lang === "ru" ? "中文" : "Русский"}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 工具栏 */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            {(["all", "active", "scheduled", "expired"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.filter[f]}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingBanner({
                id: `new-${Date.now()}`,
                title: { ru: "", zh: "" },
                type: "IMAGE",
                mediaUrl: "",
                linkType: "NONE",
                position: "HOME_TOP",
                sortOrder: banners.length + 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t.actions.add}
          </button>
        </div>

        {/* Banner 列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.loading}
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t.messages.noData}
            </div>
          ) : (
            <div className="divide-y">
              {filteredBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50"
                >
                  {/* 预览图 */}
                  <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {banner.type === "IMAGE" ? (
                      <img
                        src={banner.mediaUrl || "https://picsum.photos/128/80"}
                        alt={banner.title[lang]}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Video className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {banner.title[lang] ||
                        (lang === "ru" ? "Без названия" : "无标题")}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        {banner.type === "IMAGE" ? (
                          <Image className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                        {banner.type === "IMAGE"
                          ? t.banner.image
                          : t.banner.video}
                      </span>
                      <span>{t.banner.positions[banner.position]}</span>
                      {banner.linkUrl && (
                        <span className="flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          {banner.linkType === "INTERNAL"
                            ? t.banner.internal
                            : t.banner.external}
                        </span>
                      )}
                    </div>
                    {(banner.startTime || banner.endTime) && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(banner.startTime)} -{" "}
                        {formatDateTime(banner.endTime)}
                      </div>
                    )}
                  </div>

                  {/* 状态 */}
                  <button
                    onClick={() => toggleActive(banner.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      banner.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {banner.isActive ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    {banner.isActive ? t.banner.active : t.banner.inactive}
                  </button>

                  {/* 排序 */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveBanner(banner.id, "up")}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBanner(banner.id, "down")}
                      disabled={index === filteredBanners.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 操作 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingBanner(banner);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBanner(banner.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 编辑表单 */}
        {showForm && editingBanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingBanner.id.startsWith("new-")
                    ? t.actions.add
                    : t.actions.edit}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBanner(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 标题 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.titleRu}
                    </label>
                    <input
                      type="text"
                      value={editingBanner.title.ru}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          title: { ...editingBanner.title, ru: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.titleZh}
                    </label>
                    <input
                      type="text"
                      value={editingBanner.title.zh}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          title: { ...editingBanner.title, zh: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 类型和位置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.type}
                    </label>
                    <select
                      value={editingBanner.type}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          type: e.target.value as "IMAGE" | "VIDEO",
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="IMAGE">{t.banner.image}</option>
                      <option value="VIDEO">{t.banner.video}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.position}
                    </label>
                    <select
                      value={editingBanner.position}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          position: e.target.value as Banner["position"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {Object.entries(t.banner.positions).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* 媒体 URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.banner.mediaUrl}
                  </label>
                  <input
                    type="text"
                    value={editingBanner.mediaUrl}
                    onChange={e =>
                      setEditingBanner({
                        ...editingBanner,
                        mediaUrl: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {editingBanner.mediaUrl && editingBanner.type === "IMAGE" && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img
                        src={editingBanner.mediaUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            "https://picsum.photos/800/300";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 链接 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.linkType}
                    </label>
                    <select
                      value={editingBanner.linkType}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          linkType: e.target.value as Banner["linkType"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="NONE">{t.banner.none}</option>
                      <option value="INTERNAL">{t.banner.internal}</option>
                      <option value="EXTERNAL">{t.banner.external}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.linkUrl}
                    </label>
                    <input
                      type="text"
                      value={editingBanner.linkUrl || ""}
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          linkUrl: e.target.value,
                        })
                      }
                      placeholder={
                        editingBanner.linkType === "INTERNAL"
                          ? "/activity-center"
                          : "https://..."
                      }
                      disabled={editingBanner.linkType === "NONE"}
                      className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* 时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.startTime}
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.startTime
                          ? editingBanner.startTime.slice(0, 16)
                          : ""
                      }
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          startTime: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.banner.endTime}
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.endTime
                          ? editingBanner.endTime.slice(0, 16)
                          : ""
                      }
                      onChange={e =>
                        setEditingBanner({
                          ...editingBanner,
                          endTime: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* 状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.banner.status}
                  </label>
                  <select
                    value={editingBanner.isActive ? "active" : "inactive"}
                    onChange={e =>
                      setEditingBanner({
                        ...editingBanner,
                        isActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">{t.banner.active}</option>
                    <option value="inactive">{t.banner.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBanner(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => saveBanner(editingBanner)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {t.actions.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
