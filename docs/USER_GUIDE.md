# Pomodoroz 规划工作台使用与部署指南 (WEB-WB-04)

Pomodoroz 是一款支持跨设备同步的个人番茄工作法与 5×5 / 四象限任务规划矩阵工作台。支持桌面 Windows、Web 浏览器以及手机 PWA 独立安装运行。

---

## 一、本地桌面运行

### 1. 开发调试与启动

```bash
# 启动 Web 渲染器预览
pnpm dev:web

# 启动桌面窗口（Tauri 客户端）
pnpm dev:app
```

### 2. 自动化检查与本地构建

```bash
# 单元测试与端到端状态验证
pnpm test:run

# 类型检查
pnpm typecheck:renderer

# 代码风格核验
pnpm lint:renderer

# 生产环境静态打包（输出至 app/renderer/build）
pnpm build:renderer
```

---

## 二、Cloudflare Pages 静态部署配置

### 1. 构建设置

- **Framework preset**: `Vite` (或 None)
- **Build command**: `pnpm build:renderer`
- **Build output directory**: `app/renderer/build`
- **Node.js Version**: 18+ (推荐 20 或 22)

### 2. 环境变量设置 (Environment Variables)

在 Cloudflare Pages 控制台的 **Settings -> Environment variables** 中配置以下客户端公开变量：

- `VITE_SUPABASE_URL`: 您的 Supabase 项目 URL（形如 `https://xxxx.supabase.co`）
- `VITE_SUPABASE_ANON_KEY`: 您的 Supabase 匿名公开客户端密钥（anon public key）

> **安全红线**：
>
> - 仅填入公开的 `anon` / `publishable` 密钥！
> - **严禁填入 `service_role` 或任何服务端私钥**。前端应用无需也不应获得管理密钥，所有安全隔离均由数据库行级安全 (RLS) 强制保证。

### 3. SPA 路由与缓存

项目已在 `app/renderer/public` 内内置：

- `_redirects`：配置 `/* /index.html 200`，确保任何直接刷新均正确由 HashRouter / SPA 接管。
- `_headers`：为静态资产、PWA `sw.js` 与 `manifest.webmanifest` 提供精确的缓存控制与安全安全标头。

---

## 三、Supabase 数据库与 RLS 迁移配置

### 1. 创建 Supabase 项目

在 [supabase.com](https://supabase.com) 注册并新建免费个人项目。

### 2. 执行数据库初始化迁移

打开项目的 **SQL Editor**，复制并执行仓库中的初始化脚本：

- 文件路径：`supabase/migrations/20261005_init_schema.sql`

该脚本将自动完成：

1. 创建 `user_settings`、`task_lists`、`tasks`、`focus_sessions` 四张核心业务表；
2. 为每张表启用 `ROW LEVEL SECURITY (RLS)`；
3. 配置基于 `auth.uid() = user_id` 的行级增删改查隔离规则，防止匿名访问与用户间数据越权；
4. 开启 Supabase Realtime 数据变更广播发布。

---

## 四、初次登录与跨设备同步使用

### 1. 注册与登录

1. 打开应用，进入右上角「设置」页面（点击齿轮图标）；
2. 找到「云端同步与账号 (Supabase)」模块；
3. 点击「注册账号」，输入邮箱和密码创建账号；
4. 创建后点击「登录」完成身份认证。

### 2. 跨设备双向同步机制

- **秒级自动同步**：同一账号在电脑与手机同时在线时，任意端对任务列表、卡片分值、明确计划、打卡状态或主题设置的修改，将在 5 秒内自动呈现在另一端；
- **专注记录幂等保存**：完成专注保存时以稳定唯一的会话 ID 登记，即使网络波动重复请求也不会造成重复专注次数或统计时长虚增；
- **离线排队与自动重试**：网络中断时，所有本地输入直接生效并持久化至本地待同步队列（`pomodoroz_sync_queue`）；网络恢复时自动静默重试，绝不静默覆盖或丢弃修改。

---

## 五、本地历史数据安全迁移指南

在从 `localhost:3000` 首次切换至 Cloudflare Pages 独立域名时，受浏览器同源策略限制，新域名无法直接读取旧域名的 `localStorage`。项目提供两种安全迁移方案：

### 方案 A：一键上传本机数据至云端（推荐）

1. 在原有域名或 localhost 启动应用；
2. 在「设置 -> 云端同步与账号」登录您的 Supabase 账号；
3. 点击「**上传本机数据至云端**」按钮；
4. 系统会将当前的全部任务、矩阵排期、主题设置与历史专注记录安全推送到云账号中；
5. 在手机或 Cloudflare Pages 域名登录同一账号，系统将自动拉取对齐。

### 方案 B：完整工作台备份导出与导入（离线跨域全量迁移）

1. 在旧来源进入「设置 -> 工作台完整数据迁移与备份」；
2. 点击「**导出工作台备份 (JSON)**」，下载 `pomodoroz-workbench-backup-*.json`；
3. 在新域名（或手机端浏览器）进入相同设置区域，点击「**导入备份文件...**」；
4. 系统首先弹出「**待导入工作台数据预览**」弹窗，向您展示任务列表数、任务卡片数、专注记录条数与设置概要；
5. 仔细核对后点击「**确认并导入**」，系统将在本地保留回滚快照并幂等合并数据；
6. 若发生误操作，可点击「**撤销上次导入 (回滚)**」一键恢复。

---

## 六、手机端 PWA 安装与独立运行

### 1. Android (Chrome / Edge / 常见浏览器)

1. 在手机浏览器中打开部署好的 Cloudflare Pages 网址；
2. 点击浏览器右上角菜单（三个点），选择「**添加到主屏幕**」或「**安装应用**」；
3. 确认后，Pomodoroz 将以独立 App 图标形式出现在手机桌面；
4. 启动后具备独立全屏窗口、离线外壳缓存与原生级操作体验。

### 2. iOS (Safari)

1. 在 iPhone 的 Safari 浏览器中打开该网址；
2. 点击底部工具栏正中的「分享」按钮；
3. 在弹出面板中向下滑动，选择「**添加到主屏幕**」；
4. 命名为 Pomodoroz 并确认即可。
