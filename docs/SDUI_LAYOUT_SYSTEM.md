# SDUI 布局配置系统文档

## 概述

SDUI (Server-Driven UI) 布局配置系统允许管理员通过可视化界面动态配置页面布局，无需重新部署代码。

## 功能特性

### 1. 页面管理

- **支持的页面**: 首页 (home)、下单页 (order)、商城页 (mall)
- **布局列表**: `/admin/layouts` - 查看所有页面的配置状态
- **可视化编辑器**: `/admin/layouts/edit/:page` - 拖拽式布局编辑

### 2. 组件库

系统内置以下可配置组件：

#### Banner（横幅）

- 图片轮播
- 自动播放设置
- 高度可调
- 支持跳转链接
- 多语言 alt 文本

#### Product Block（商品区块）

- 标题多语言支持
- 布局方式：网格/列表/轮播
- 显示数量限制
- 价格显示开关
- 加入购物车按钮开关

#### Category Navigation（分类导航）

- 网格或横向滚动布局
- 图标 + 名称
- 列数可调
- 跳转链接

#### Text Block（文字块）

- 多语言内容
- 对齐方式：左/中/右
- 字体大小：sm/base/lg/xl
- 字体粗细
- 颜色和背景色
- 内边距

#### Image Block（图片块）

- 单张图片
- 跳转链接
- 宽高比设置
- 对象适配方式

#### Divider（分隔线）

- 厚度可调
- 颜色可选
- 上下边距

#### Spacer（间隔器）

- 高度可调
- 用于组件间距

### 3. 编辑模式

#### 可视化模式

- 拖拽排序组件
- 直观的上下移动按钮
- 显示/隐藏切换
- 点击编辑属性
- 删除组件

#### JSON 模式

- 直接编辑 JSON 配置
- 语法高亮
- 错误提示
- 实时验证

### 4. 实时预览

- 右侧预览面板
- 实时反映配置更改
- 移动端风格展示
- 支持滚动查看完整布局

### 5. 版本管理

- 自动版本号递增
- 版本历史记录
- 一键还原到历史版本
- 记录修改人和修改时间

### 6. 国际化支持

- 界面语言：中文、俄语、英语
- 组件内容多语言配置
- 语言切换无需刷新

## 技术实现

### 后端 API

#### 1. GET /api/admin/layouts

获取所有页面的布局配置列表

```typescript
Response: {
  layouts: LayoutConfig[]
}
```

#### 2. GET /api/admin/layouts/:page

获取指定页面的当前激活布局

```typescript
Request: {
  page: "home" | "order" | "mall";
}
Response: {
  layout: LayoutConfig;
}
```

#### 3. PUT /api/admin/layouts/:page

保存新版本的布局配置

```typescript
Request: {
  page: "home" | "order" | "mall";
  config: PageLayoutConfig;
}
Response: {
  layout: LayoutConfig;
  message: string;
}
```

#### 4. POST /api/admin/layouts/:page/restore

还原到指定历史版本

```typescript
Request: {
  page: "home" | "order" | "mall";
  version: number;
}
Response: {
  layout: LayoutConfig;
  message: string;
}
```

### 数据库结构

```sql
CREATE TABLE layout_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(50) NOT NULL,
  config JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX layout_page_idx (page),
  INDEX layout_active_idx (is_active),
  UNIQUE INDEX layout_page_version_idx (page, version)
);
```

### 类型定义

核心类型位于 `shared/types/layout.ts`:

```typescript
// 组件类型
type ComponentType =
  | "banner"
  | "product-block"
  | "category-nav"
  | "text-block"
  | "image-block"
  | "divider"
  | "spacer";

// 页面类型
type PageType = "home" | "order" | "mall";

// 多语言文本
interface I18nText {
  zh?: string;
  ru?: string;
  en?: string;
}

// 组件定义
interface LayoutComponent {
  id: string;
  type: ComponentType;
  props: ComponentProps;
  visible?: boolean;
  order?: number;
}

// 页面布局配置
interface PageLayoutConfig {
  page: PageType;
  blocks: LayoutComponent[];
  meta?: {
    title?: I18nText;
    description?: I18nText;
  };
}
```

## 使用指南

### 管理员操作流程

1. **访问布局管理**
   - 登录管理后台
   - 导航到 `/admin/layouts`
   - 查看所有页面的配置状态

2. **编辑页面布局**
   - 点击对应页面的"编辑"按钮
   - 进入可视化编辑器

3. **添加组件**
   - 点击"添加组件"按钮
   - 从组件库中选择所需组件
   - 组件会添加到布局底部

4. **配置组件**
   - 点击组件的编辑图标
   - 在属性编辑器中配置组件属性
   - 多语言文本需填写所有语言版本

5. **调整顺序**
   - 使用上下箭头按钮移动组件
   - 或切换到 JSON 模式手动调整

6. **预览和保存**
   - 打开预览面板查看效果
   - 确认无误后点击"保存"
   - 系统自动创建新版本

7. **版本管理**
   - 点击"历史"查看所有版本
   - 需要时可还原到历史版本
   - 还原操作会创建新版本

### 开发者指南

#### 扩展新组件类型

1. **定义组件类型和属性**

   ```typescript
   // shared/types/layout.ts
   export interface MyNewComponentProps {
     title: I18nText;
     // 其他属性...
   }

   // 添加到 ComponentType
   type ComponentType = ... | "my-new-component";
   ```

2. **添加默认属性**

   ```typescript
   // LayoutVisualEditor.tsx
   function getDefaultProps(type) {
     case "my-new-component":
       return { title: { zh: "", ru: "", en: "" } };
   }
   ```

3. **实现预览渲染**

   ```typescript
   // LayoutPreview.tsx
   function ComponentPreview({ component }) {
     case "my-new-component":
       return <div>...</div>;
   }
   ```

4. **添加属性编辑器**
   ```typescript
   // ComponentPropsEditor.tsx
   function renderPropsEditor() {
     case "my-new-component":
       return <div>...</div>;
   }
   ```

#### 添加新页面类型

1. **更新类型定义**

   ```typescript
   // shared/types/layout.ts
   type PageType = ... | "new-page";

   export const DEFAULT_NEW_PAGE_LAYOUT = {
     page: "new-page",
     blocks: [...],
   };
   ```

2. **更新路由器**

   ```typescript
   // server/src/trpc/routers/layout.router.ts
   function getDefaultLayout(page) {
     case "new-page":
       return DEFAULT_NEW_PAGE_LAYOUT;
   }
   ```

3. **添加页面名称翻译**
   ```typescript
   // LayoutsList.tsx & LayoutEditor.tsx
   const pageNames = {
     ...
     "new-page": { zh: "...", ru: "...", en: "..." }
   };
   ```

## 安全考虑

1. **权限控制**: 所有 API 使用 `adminProcedure`，确保只有管理员可以访问
2. **数据验证**: 使用 Zod schema 验证输入数据
3. **SQL 注入防护**: 使用 Drizzle ORM 的参数化查询
4. **XSS 防护**: React 自动转义输出内容

## 性能优化

1. **数据库索引**: page, is_active, (page, version) 上建立索引
2. **查询优化**: 只获取激活版本，避免全表扫描
3. **前端缓存**: 使用 tRPC 的查询缓存
4. **懒加载**: 历史版本按需加载

## 测试

### 单元测试

```bash
npm test server/src/trpc/routers/layout.router.test.ts
```

### 手动测试清单

- [ ] 查看布局列表
- [ ] 编辑各个页面布局
- [ ] 添加/删除/编辑组件
- [ ] 调整组件顺序
- [ ] 切换可视化/JSON 模式
- [ ] 查看实时预览
- [ ] 保存配置
- [ ] 查看版本历史
- [ ] 还原历史版本
- [ ] 测试多语言切换

## 常见问题

### Q: 为什么保存后页面没有立即更新？

A: 前端页面需要刷新才能加载新配置。可以考虑实现 WebSocket 推送或轮询机制。

### Q: 如何批量导入配置？

A: 可以使用 JSON 模式，将完整配置粘贴进去，然后点击"应用更改"。

### Q: 版本历史会无限增长吗？

A: 当前版本保留所有历史。可以添加定期清理策略，保留最近 N 个版本。

### Q: 如何备份配置？

A: 可以通过数据库备份，或者在 JSON 模式下复制配置内容保存到文件。

## 未来改进

1. **拖拽功能增强**: 实现真正的拖放操作（使用 react-beautiful-dnd）
2. **组件模板**: 预设常用布局模板
3. **A/B 测试**: 支持多版本并行测试
4. **权限细分**: 不同管理员可编辑不同页面
5. **变更审批流**: 配置需审批后才能上线
6. **实时协作**: 多人同时编辑时的冲突处理
7. **移动端编辑**: 支持在移动设备上编辑布局
8. **导入导出**: 批量导入导出配置文件

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
