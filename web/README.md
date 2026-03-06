# Metai Game Editor

## 项目简介

这是一个基于 Next.js 开发的游戏编辑器前端项目，使用了 Konva 进行画布操作。

## 环境要求

- Bun (推荐 v1.3+)
- Node.js (仅在部分数据库驱动/工具链场景下需要，推荐 v20.9+)

## 快速开始

### 1. 安装依赖

在项目根目录下运行以下命令安装依赖：

```bash
bun install
```

### 2. 启动开发服务器

安装完成后，运行以下命令启动开发环境：

```bash
bun run dev
```

启动成功后，打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可看到项目运行效果。

## 登录与认证（SparkX API）

当前登录链路已切到你提供的后端 API（`47.112.97.49:6001`），不再依赖 Better Auth 的邮箱登录。

### 实现细节（代码级）

**登录代理路由**

- `src/app/api/sparkx/auth/login/route.ts`
- 前端提交邮箱/密码（注册页会额外带 `username`）
- 服务端转发到：`POST /api/v1/auth/login`（`loginType=email`）
- 登录成功后会写入 HttpOnly 会话 Cookie（`sparkx_session`）

**Google 登录代理路由**

- `src/app/api/sparkx/auth/login-google/route.ts`
- 前端提交 Google `idToken`
- 服务端转发到：`POST /api/v1/auth/login`（`loginType=google`）
- 登录成功后写入 `sparkx_session` Cookie

**退出登录路由**

- `src/app/api/sparkx/auth/logout/route.ts`
- 清理 `sparkx_session` Cookie

**会话校验**

- `src/lib/sparkx-session.ts`
- 通过 HMAC 签名 Cookie（防篡改）
- 页面与 API 路由统一用 `getSparkxSessionFromHeaders(...)` 判定登录态
- 已切换页面：
  - `src/app/login/page.tsx`
  - `src/app/page.tsx`
  - `src/app/projects/page.tsx`
  - `src/app/projects/[projectId]/page.tsx`
  - `src/app/projects/[projectId]/edit/page.tsx`

**前端登录/退出组件**

- 登录：`src/components/Auth/LoginForm.tsx`
  - 登录与注册都走 `/api/sparkx/auth/login`
- 退出：`src/components/Auth/AuthControls.tsx`
  - 调用 `/api/sparkx/auth/logout`

### 1. 环境变量

复制 `.env.example` 为 `.env.local`（或 `.env`），并补齐以下变量：

```bash
SPARKX_API_BASE_URL=http://47.112.97.49:6001
GOOGLE_CLIENT_ID=replace-with-google-oauth-client-id
SESSION_SECRET=replace-with-a-strong-random-secret
SESSION_MAX_AGE=2592000
```

> `SPARKX_API_BASE_URL`：外部业务 API 地址（支持 `http://` 或 `https://`）。
> `GOOGLE_CLIENT_ID`：Google 登录按钮使用的 OAuth Client ID（Web 应用类型）。
> `SESSION_SECRET`：用于签名会话 Cookie，生产环境务必配置高强度随机值。
> `SESSION_MAX_AGE`：会话有效期（秒），默认 30 天。

## 构建生产版本

如果需要构建生产环境版本，请运行：

```bash
bun run build
```

构建完成后，可以通过以下命令启动生产服务：

```bash
bun run start
```

## 测试（BDD / 行为驱动）

当前前端提供轻量的 BDD 风格测试（Given/When/Then），不依赖后端服务：

```bash
bun run test
```

示例用例：

- 语言切换：`src/components/I18n/LanguageSwitcher.bdd.test.tsx`
- 项目列表本地存储：`src/lib/projects.bdd.test.ts`

## 技术栈

- **框架**: [Next.js](https://nextjs.org/) 14 (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **画布库**: [Konva](https://konvajs.org/) / [React Konva](https://konvajs.org/docs/react/index.html)
- **图标**: [Lucide React](https://lucide.dev/)

## 目录结构

- `src/app`: Next.js App Router 页面及布局
- `src/components`: 组件目录
  - `src/components/Workspace`: 编辑器工作区（核心）
    - `Workspace.tsx`: 三栏布局与 Editor/Game 模式切换
    - `CanvasArea.tsx`: 工具栏、浮动属性面板、快捷键、下载导出等 UI 逻辑
    - `EditorStage.tsx`: Konva Stage/Layer 渲染与鼠标事件分发
    - `types/*`: 元素数据模型（ElementState / BaseElement / ToolType 等）
    - `editor/*`: 工具系统、元素注册、吸附/舞台工具函数、历史控制、右键菜单等
    - `chat|game|hierarchy|project/*`: 右侧聊天、游戏面板、左侧图层/项目面板
- `src/store/useWorkspaceStore.ts`: Zustand 全局状态与 zundo 撤销/重做历史
- `public/*`: 静态资源（默认图片等）
- `illustrate/*`: 项目截图/示意图

## 架构概览（编辑器主链路）

编辑器的核心链路可以概括为：状态（elements）→ 渲染（Konva）→ 交互（工具）→ 回写状态（并进入历史）。

- 页面入口：`src/app/page.tsx` 直接渲染 [Workspace](./src/components/Workspace/Workspace.tsx)
- 布局与模式：Workspace 负责左侧（图层/项目）、中间（Editor/Game）、右侧（聊天）三栏与模式切换
- 编辑器容器：CanvasArea 承载工具选择、缩放、浮动属性面板、快捷键（Undo/Redo、删除、切换工具等）
- 画布渲染：EditorStage 负责 Konva 的 Stage/Layer/Transformer，并把鼠标事件分发给当前工具实例

## 状态管理与历史（Zustand + zundo）

[useWorkspaceStore](./src/store/useWorkspaceStore.ts) 维护编辑器核心状态：

- `elements`: 画布元素列表（以类实例的形式存储，来自 `ElementFactory`）
- `selectedId`: 当前选中元素
- `activeTool`: 当前工具（select/hand/pen/pencil/shape/text 等）
- `guidelines`: 吸附对齐参考线
- `temporal(...)`: 通过 zundo 自动记录 `elements` 的变更，实现撤销/重做

说明：

- 历史只追踪 `elements`（selection/tool 不进入历史），避免 undo/redo 干扰 UI 状态
- 元素以不可变方式更新：`updateElement` 通过 `el.update(...)` 生成新实例，便于时间旅行与 React 渲染

## 元素模型（types 与 ElementFactory）

元素模型集中在 [BaseElement.ts](./src/components/Workspace/types/BaseElement.ts) 与 `types/ElementState.ts`：

- `BaseElement<T>`：抽象基类，提供 `toState()`、`update()`、`clone()` 等不可变操作
- `ShapeElement/TextElement/TextShapeElement/ImageElement/DrawElement`：不同元素类型的具体类
- `ElementFactory.create(state)`：把持久化的 state 转成对应元素类实例
- `ElementFactory.createDefault(type, x, y, id?)`：创建默认元素（拖拽/点击创建时使用）

## 渲染层（React Konva + 注册表）

渲染发生在 [EditorStage](./src/components/Workspace/EditorStage.tsx)：

- Konva `Stage`：承载缩放（scaleX/scaleY）与平移（x/y）
- `Layer`：渲染 `elements`（以及绘制中预览的 `previewElement`）
- `Transformer`：选中元素的缩放/旋转控制器
- 元素组件选择：通过 `editor/tools/ElementRegistry.ts`（注册表）按 `el.type` 找到对应 React 组件（通常位于各工具目录下的 `Element.tsx`）

为避免 Konva 在 SSR 环境报错，CanvasArea 使用 Next.js dynamic import 禁用 SSR：

- `const EditorStage = dynamic(() => import('./EditorStage'), { ssr: false })`

## 工具系统（ToolFactory + MouseAction）

工具系统位于 `src/components/Workspace/editor/tools/*`，核心思想是把“交互策略”封装为工具实例：

- `ToolType`：工具/元素类型枚举（在 `types/ToolType.ts`）
- `ToolFactory.createTool(activeTool)`：根据当前工具返回对应 MouseAction 实例
- `IMouseAction`：工具统一接口（onMouseDown/onMouseMove/onMouseUp/onDblClick）
- 事件流：Konva Stage 事件 → EditorStage → 当前 tool 的 MouseAction → 更新 store（elements/selection/guidelines）

新增一个工具的一般步骤（按现有约定）：

- 在 `editor/tools/<tool-name>/` 新增 `MouseAction.ts`（交互）与 `Element.tsx`（渲染）
- 在 ElementRegistry 注册渲染组件；在 ToolFactory 注册 MouseAction
- 如需属性面板，在对应目录补充 `InspectorBar.tsx`，并由 CanvasArea 按元素类型/工具状态决定显示

## 对齐吸附（Guidelines）

对齐吸附逻辑位于 `editor/utils/snapUtils.ts`：

- Transformer 的 `boundBoxFunc` 会计算与其他元素的对齐关系
- 命中吸附时写入 `guidelines`，EditorStage 渲染虚线参考线（Line）

## 常用快捷键（CanvasArea）

[CanvasArea](./src/components/Workspace/CanvasArea.tsx) 监听全局键盘事件：

- 撤销/重做：Ctrl/Cmd+Z，Shift+Ctrl/Cmd+Z 或 Ctrl/Cmd+Y
- 删除：Delete / Backspace
- 工具切换：V(select)、H(hand)、P(pen)、Shift+P(pencil)、R(rectangle)、O(circle)、T(text)

## 导出/下载（元素 PNG）

CanvasArea 内部实现了元素下载：

- 通过 Konva `stage.findOne('#' + selectedId)` 找到选中元素节点
- `node.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })` 生成图片
- 通过创建 `<a download>` 触发浏览器下载

## 构建与部署

- 本地开发：`bun run dev`（默认 http://localhost:3000）
- 生产构建：`bun run build`
- 生产启动：`bun run start`
- Docker：仓库提供 [Dockerfile](./Dockerfile)，使用 Next.js `output: 'standalone'`（见 [next.config.mjs](./next.config.mjs)）生成更小的运行镜像
