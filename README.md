<p align="center">
  <strong>NowBuild SaaS Kit</strong><br/>
  开箱即用的 SaaS 全栈框架 · 认证 · 支付 · 数据库 · 数据分析 · SEO · 多语言
</p>

<p align="center">
  <a href="https://NowBuild.ai/zh/open-source-saas-starter">🌐 项目主页</a> · <a href="./README.en.md">English</a> | 中文
</p>

---

## 这个项目是什么？

**NowBuild SaaS Kit** 是一个帮你快速搭建 SaaS 产品的"脚手架"框架。

简单来说：如果你想做一个需要用户登录、在线收费、有官网有博客的网站产品，用这个框架1天就能搞定，不需要从零写起。

它帮你把下面这些"造轮子"的工作全做好了：

| 要做的事 | 我们用了什么 | 你要花的时间 |
|---------|------------|------------|
| 用户登录/注册 | Clerk | 已集成，0 小时 |
| 在线收费（订阅制） | Stripe | 已集成，0 小时 |
| 数据分析 | Google Analytics | 已集成，0 小时 |
| 数据库 | Supabase | 已集成，0 小时 |
| 多语言（中/英） | next-intl | 已集成，0 小时 |
| SEO 搜索优化 | 结构化数据 + 元标签 | 已内置，0 小时 |
| 部署上线 | Vercel 一键部署 | 5 分钟 |

> 如果从零搭这些，一般需要 2-4 周。用 NowBuild，几天就能上线。

---

## 技术栈一览

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 15 | React 全栈框架，支持服务端渲染 |
| 语言 | TypeScript | 类型安全，减少 bug |
| 样式 | Tailwind CSS 4 | 原子化 CSS，快速写样式 |
| 认证 | Clerk | 用户登录、注册、社交登录 |
| 支付 | Stripe | 全球最主流的在线支付平台 |
| 数据库 | Supabase | 基于 PostgreSQL 的云数据库 |
| 多语言 | next-intl | 国际化框架，支持任意语言 |
| 数据分析 | Google Analytics | 用户行为分析、流量统计 |
| 部署 | Vercel | Next.js 官方推荐的部署平台 |

---

## 包含哪些页面？

| 页面 | 路由 | 功能 |
|------|------|------|
| 🏠 官网首页 | `/` | Hero 首屏 + 功能对比 + 亮点 + FAQ + Footer |
| 📝 博客 | `/blog` | 文章列表 + 文章详情页 |
| 💰 定价页 | `/pricing` | 月付/年付切换，三档方案 |
| 🔒 隐私协议 | `/privacy` | 完整隐私政策范文（中英双语） |
| 📜 用户协议 | `/terms` | 完整服务条款范文（中英双语） |
| 👤 关于我们 | `/about` | 团队故事 + 价值观 |
| 🔑 登录/注册 | `/sign-in` `/sign-up` | Clerk 认证页面 |

---

## 快速开始（3 步启动）

> 以下步骤假设你的电脑已经安装了 [Node.js](https://nodejs.org/)（18 版本以上）。
> 如果不确定，打开终端输入 `node -v` 看看有没有版本号。

### 第 1 步：下载项目 & 安装依赖

```bash
# 克隆仓库（或直接下载 ZIP 解压）
git clone https://github.com/your-username/nowbuild-saas-kit.git

# 进入项目文件夹
cd nowbuild-saas-kit

# 安装所有依赖包
npm install
```

### 第 2 步：配置环境变量

```bash
# 复制环境变量模板文件
cp .env.example .env.local
```

然后用任意编辑器打开 `.env.local` 文件，把里面的 `xxxxx` 替换成你的真实密钥。

> ⬇️ 不知道怎么获取这些密钥？继续往下看**详细配置指南**，手把手教你。

### 第 3 步：启动开发服务器

```bash
npm run dev
```

打开浏览器，访问 [http://localhost:3000](http://localhost:3000) ，就能看到你的网站了。

---

## 🤖 AI 智能体接入（Cursor / Claude Code / Codex）

如果你希望让 AI 直接帮你完成“快速接入 + 配置排查”，可以使用仓库内置 Skill：

- 中文版：`skills/nowbuild-onboarding/SKILL.md`
- 英文版：`skills/nowbuild-onboarding/SKILL.en.md`

推荐触发语句示例：

- “帮我在 Cursor 里把这个 SaaS 框架跑起来”
- “在 Claude Code 里接入这个项目并完成 env 配置”
- “Codex 里如何最快跑通这个框架？”

这个 Skill 会引导用户完成最短路径：安装依赖、复制并配置 `.env.local`、启动开发服务、验证关键页面（`/`、`/sign-in`、`/pricing`），并给出常见报错排查步骤。

---

## 🔑 环境变量配置指南（新手必读）

> 这是整个文档最重要的部分。下面会手把手教你获取每一个密钥，每一步都有详细说明。

你需要在以下平台注册账号并获取密钥：

| 平台 | 用途 | 注册地址 |
|------|------|---------|
| Clerk | 用户登录/注册 | https://clerk.com |
| Stripe | 在线支付/收款 | https://stripe.com |
| Supabase | 数据库存储 | https://supabase.com |
| Google Analytics | 用户行为分析 | https://analytics.google.com |

打开你的 `.env.local` 文件，你会看到类似这样的内容：

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxxxx

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyxxxxx

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NowBuild
```

下面我们逐个平台来获取这些值。

---

### 📌 第一步：配置 Clerk（用户认证）

> Clerk 负责你网站的用户登录、注册功能。你需要获取 **2 个密钥**。

#### 需要获取的值

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 公开密钥（可以暴露在前端） |
| `CLERK_SECRET_KEY` | 私密密钥（只能在服务器端使用） |

#### 操作步骤

**1. 注册 Clerk 账号**

- 打开 https://clerk.com
- 点击右上角 **「Sign Up」** 按钮
- 可以用 GitHub、Google 或邮箱注册

**2. 创建一个 Application（应用）**

- 登录后，你会看到 Dashboard（仪表盘）
- 点击 **「+ Create application」** 按钮
- 填写应用名称，比如输入 `NowBuild`
- 在 **「Sign in options」** 里勾选你想支持的登录方式（推荐勾选 Email 和 Google）
- 点击 **「Create application」**

**3. 复制密钥**

创建完成后，Clerk 会直接展示你的两个密钥：

- 页面上会显示一段代码示例，里面包含：
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxx...`
  - `CLERK_SECRET_KEY=sk_test_xxxxxx...`
- 将这两个值复制，粘贴到你的 `.env.local` 文件中对应的位置

> 💡 **找不到密钥？** 在 Clerk Dashboard 左侧菜单点击 **「API Keys」**，就能看到。

> ⚠️ **安全提醒**：`CLERK_SECRET_KEY` 是私密密钥，**绝对不要**公开发布到 GitHub 或分享给别人。`.env.local` 文件已经被加入了 `.gitignore`，不会被 Git 追踪。

---

### 📌 第二步：配置 Stripe（在线支付）

> Stripe 是全球最主流的在线支付平台，负责你网站的收费功能。
> 这部分内容最多，请耐心按步骤操作。你需要获取 **5 个值**。

#### 需要获取的值

| 变量名 | 说明 | 在哪里获取 |
|--------|------|-----------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 公开密钥 | API Keys 页面 |
| `STRIPE_SECRET_KEY` | 私密密钥 | API Keys 页面 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名密钥 | Webhooks 页面 |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | 月付价格 ID | Products 页面 |
| `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` | 年付价格 ID | Products 页面 |

#### 2.1 注册 Stripe 账号

- 打开 https://stripe.com
- 点击 **「Start now」** 注册账号
- 按提示填写邮箱、设置密码
- 登录后你会进入 Stripe Dashboard

> 💡 Stripe 有两种模式：**Test（测试）模式** 和 **Live（正式）模式**。
> - **Test 模式**：不会产生真实扣款，用于开发调试。密钥以 `pk_test_` 和 `sk_test_` 开头
> - **Live 模式**：会产生真实交易。密钥以 `pk_live_` 和 `sk_live_` 开头
>
> 开发阶段请使用 Test 模式，确认没问题后再切换到 Live 模式。

#### 2.2 获取 API 密钥

**操作路径：Dashboard → 右上角「Developers」→ 「API Keys」**

具体步骤：

1. 在 Stripe Dashboard 页面
2. 确保页面顶部显示 **「Test mode」**（有一个开关可以切换，亮色 = 测试模式）
3. 点击右上角 **「Developers」** 按钮（齿轮图标旁边）
4. 在左侧菜单点击 **「API Keys」**
5. 你会看到两个密钥：
   - **Publishable key**（可发布密钥）：以 `pk_test_` 开头 → 复制，粘贴到 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key**（私密密钥）：点击 **「Reveal test key」** 按钮查看，以 `sk_test_` 开头 → 复制，粘贴到 `STRIPE_SECRET_KEY`

> ⚠️ **Secret Key 只会显示一次**，请立即复制保存。如果忘了，可以点击「Roll key」生成新的（旧的会失效）。

#### 2.3 创建产品和价格（获取 Price ID）

> 你需要在 Stripe 里创建一个"产品"，然后为这个产品设置月付和年付两种价格。

**操作路径：Dashboard → 左侧「Products」→ 「+ Add product」**

**第 1 步：创建产品**

1. 在 Dashboard 左侧菜单，点击 **「Products」**（产品目录）
2. 点击右上角 **「+ Add product」** 按钮
3. 填写产品信息：
   - **Name（名称）**：填 `NowBuild Pro`（或你的付费方案名字）
   - **Description（描述）**：填 `Professional plan with unlimited features`（可选）
4. 先别急着点保存，继续往下设置价格 👇

**第 2 步：添加月付价格**

在同一个页面的 **「Pricing」** 区域：

1. **Model（定价模式）**：选择 **「Recurring」**（周期性收费 = 订阅制）
2. **Price（价格）**：输入月付金额，比如 `29.00`
3. **Currency（货币）**：选择 `USD` 或你需要的货币
4. **Billing period（计费周期）**：选择 **「Monthly」**（每月）
5. 点击 **「Add another price」** 继续添加年付价格 👇

**第 3 步：添加年付价格**

1. 在新增的价格行中：
2. **Model**：选择 **「Recurring」**
3. **Price**：输入年付金额，比如 `278.00`（相当于每月约 $23，给年付用户打折）
4. **Billing period**：选择 **「Yearly」**（每年）
5. 点击右上角 **「Save product」** 保存

**第 4 步：复制 Price ID**

1. 保存后，你会进入这个产品的详情页
2. 在 **「Pricing」** 部分，你会看到刚才创建的两个价格
3. 每个价格旁边有一个 ID，格式类似 `price_1Abc2DefGhIjKl`
4. 找到月付价格的 ID → 复制，粘贴到 `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
5. 找到年付价格的 ID → 复制，粘贴到 `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID`

> 💡 **找不到 Price ID？** 点击某个价格行，展开详情，ID 会显示在右上角或详情区域。也可以直接复制 URL 中的 `price_xxx` 部分。

#### 2.4 配置 Webhook（重点！）

> **什么是 Webhook？**
> 当用户完成支付后，Stripe 需要主动通知你的网站"用户付款成功了"。
> 这个通知机制就叫 Webhook。Stripe 会向你指定的网址发送一个 HTTP 请求，
> 你的代码收到后就会更新用户的订阅状态。
>
> 如果不配置 Webhook，用户付完钱后你的系统不会知道。

**操作路径：Dashboard → 「Developers」→ 「Webhooks」**

**线上环境的 Webhook 配置：**

1. 在 Stripe Dashboard 点击右上角 **「Developers」**
2. 在左侧菜单点击 **「Webhooks」**
3. 点击 **「+ Add endpoint」**（添加端点）按钮
4. 在 **「Endpoint URL」** 输入框中填入：

```
https://你的域名/api/webhooks/stripe
```

比如你的网站是 `https://app.nowbuild.com`，就填：
```
https://app.nowbuild.com/api/webhooks/stripe
```

5. 在 **「Select events to listen to」**（选择要监听的事件）区域：
   - 点击 **「+ Select events」** 按钮
   - 搜索并勾选以下 **3 个事件**：

| 事件名 | 含义 |
|--------|------|
| `checkout.session.completed` | 用户完成了支付 |
| `customer.subscription.updated` | 用户的订阅状态有变化（续费、变更方案等） |
| `customer.subscription.deleted` | 用户取消了订阅 |

6. 点击 **「Add endpoint」** 完成创建
7. 创建完成后，进入这个 Webhook 的详情页
8. 你会看到 **「Signing secret」**（签名密钥），点击 **「Reveal」** 查看
9. 复制这个以 `whsec_` 开头的值 → 粘贴到 `STRIPE_WEBHOOK_SECRET`

> ⚠️ **这个 Signing Secret 非常重要**，它用来验证收到的 Webhook 请求确实来自 Stripe，防止别人伪造支付成功的通知。

**本地开发环境的 Webhook 调试：**

> 本地开发时，Stripe 无法直接访问 `localhost`。需要使用 Stripe CLI 来转发 Webhook。

1. **安装 Stripe CLI**

```bash
# macOS（使用 Homebrew）
brew install stripe/stripe-cli/stripe

# Windows（使用 Scoop）
scoop install stripe

# 或者从官网下载：https://stripe.com/docs/stripe-cli
```

2. **登录 Stripe CLI**

```bash
stripe login
```

按提示在浏览器中授权。

3. **启动 Webhook 转发**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

运行后，CLI 会输出一个临时的 Webhook Secret：
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxx
```

4. 将这个 `whsec_xxx` 值复制到 `.env.local` 的 `STRIPE_WEBHOOK_SECRET` 中
5. 保持这个终端窗口运行，再新开一个终端窗口运行 `npm run dev`

> 💡 每次运行 `stripe listen` 生成的 secret 都不一样，记得更新 `.env.local`。上线后换成 Dashboard 里创建的正式 Webhook secret。

#### 2.5 Stripe 配置完成后的检查清单

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — 以 `pk_test_` 开头
- [ ] `STRIPE_SECRET_KEY` — 以 `sk_test_` 开头
- [ ] `STRIPE_WEBHOOK_SECRET` — 以 `whsec_` 开头
- [ ] `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` — 以 `price_` 开头
- [ ] `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` — 以 `price_` 开头

> 🎉 恭喜！Stripe 是最复杂的部分，完成这里后面就简单了。

#### 2.6 Stripe 测试方法（含测试账号）

完整测试文档见：`STRIPE_TESTING.md`

**常用测试账号（Stripe 测试卡）：**

| 场景 | 测试账号（卡号） | 其他信息 |
|------|------------------|----------|
| 支付成功 | `4242 4242 4242 4242` | 到期日填未来时间、CVC 任意 3 位、邮编任意 |
| 3D Secure 验证 | `4000 0025 0000 3155` | 用于测试需身份验证的支付流程 |
| 支付失败（余额不足） | `4000 0000 0000 9995` | 用于验证失败提示和异常分支 |

**最短测试步骤：**

1. 运行 `npm run dev`
2. 新开终端运行 `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. 将 CLI 输出的 `whsec_xxx` 写入 `.env.local` 的 `STRIPE_WEBHOOK_SECRET`，并重启服务
4. 登录站点后在定价页发起支付，分别用上面 3 张测试卡验证成功/3DS/失败路径
5. 检查 Supabase `subscriptions` 表状态是否与预期一致

---

### 📌 第三步：配置 Supabase（数据库）

> Supabase 是一个基于 PostgreSQL 的云数据库，用来存储用户数据和订阅信息。
> 你需要获取 **3 个值**。

#### 需要获取的值

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目的 API 地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名公开密钥（可用于前端） |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（拥有完全权限） |

#### 操作步骤

**1. 注册并创建项目**

- 打开 https://supabase.com
- 点击 **「Start your project」** 注册（推荐用 GitHub 登录）
- 登录后，点击 **「New Project」**
- 填写：
  - **Name（名称）**：填 `nowbuild`（或任意名字）
  - **Database Password（数据库密码）**：设置一个强密码并记住
  - **Region（区域）**：选择离你用户最近的区域
- 点击 **「Create new project」**
- 等待约 1-2 分钟，项目创建完成

**2. 获取 API 密钥**

**操作路径：左侧菜单「Settings」→ 「API」**

1. 在左侧菜单底部，点击齿轮图标 **「Settings」**
2. 点击 **「API」**（在 Configuration 分组下）
3. 在这个页面你会看到：

| 信息 | 位置 | 复制到 |
|------|------|--------|
| **Project URL** | 页面顶部 `URL` 区域 | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | `Project API Keys` 区域第一个 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role secret** | `Project API Keys` 区域第二个（点击眼睛图标显示） | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **安全提醒**：`service_role` 密钥拥有绕过 Row Level Security（行级安全）的完全权限，**绝对不要**在前端代码中使用它。它只应在服务器端（API Routes）中使用。

**3. 初始化数据库表**

项目中已经准备好了数据库建表 SQL，你需要在 Supabase 中执行它：

1. 在 Supabase Dashboard 左侧菜单，点击 **「SQL Editor」**（SQL 编辑器图标）
2. 点击 **「+ New query」**（新建查询）
3. 把项目根目录下 `supabase/schema.sql` 文件的内容全部复制，粘贴到编辑器中
4. 点击 **「Run」**（运行）按钮
5. 看到 `Success. No rows returned` 就说明成功了

这会创建一个 `subscriptions` 表，用来存储用户的订阅信息。

---

### 📌 第四步：配置 Google Analytics（数据分析）

> Google Analytics（简称 GA）是 Google 提供的免费网站分析工具，可以帮你了解：
> 有多少人访问了你的网站、他们来自哪里、看了哪些页面、停留多久等。
> 你需要获取 **1 个值**。

#### 需要获取的值

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 衡量 ID（格式：`G-XXXXXXXXXX`） |

#### 操作步骤

**1. 登录 Google Analytics**

- 打开 https://analytics.google.com
- 用你的 Google 账号登录
- 如果是第一次使用，点击 **「开始衡量」**（Start measuring）

**2. 创建账号和媒体资源**

- **账号名称**：填你的公司或项目名，比如 `NowBuild`
- 点击 **「下一步」**
- **媒体资源名称**：填 `NowBuild Website`
- 选择你的时区和货币
- 点击 **「下一步」**
- 填写业务信息（随意选择即可）
- 点击 **「创建」**

**3. 设置数据流**

- 选择平台：点击 **「网站」**（Web）
- **网站网址**：填入你的域名，比如 `nowbuild.ai`
- **数据流名称**：填 `NowBuild Web`
- 点击 **「创建数据流」**

**4. 复制衡量 ID**

- 创建完成后，你会看到数据流详情页面
- 页面右上方会显示 **「衡量 ID」**（Measurement ID），格式类似 `G-A1B2C3D4E5`
- 复制这个值 → 粘贴到 `.env.local` 的 `NEXT_PUBLIC_GA_MEASUREMENT_ID`

> 💡 **找不到衡量 ID？** 在 GA 后台左下角点击齿轮图标 **「管理」** → **「数据流」** → 点击你的数据流 → 衡量 ID 就在页面顶部。

> 💡 **不想用 GA？** 完全可以跳过这步。如果 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 保持默认的 `G-XXXXXXXXXX`，GA 脚本不会被加载，不影响网站运行和性能。

---

### 📌 第五步：应用配置

最后两个变量是应用本身的配置，很简单：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_APP_URL` | 你的网站地址 | 本地开发填 `http://localhost:3000`，上线后改成真实域名 |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | `NowBuild`（或你的产品名） |

---

### 📋 完整的 .env.local 参考

全部配置完成后，你的 `.env.local` 应该长这样（把下面的示例值替换成你的真实值）：

```env
# ========== Clerk 认证 ==========
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123...
CLERK_SECRET_KEY=sk_test_xyz789...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ========== Stripe 支付 ==========
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...
STRIPE_SECRET_KEY=sk_test_51Abc...
STRIPE_WEBHOOK_SECRET=whsec_abcdef...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1MnoPqRsTu...
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_1VwXyZaBcD...

# ========== Supabase 数据库 ==========
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ========== Google Analytics ==========
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-A1B2C3D4E5

# ========== 应用配置 ==========
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NowBuild
```

---

## 项目结构

```
├── middleware.ts                  # Clerk + next-intl 中间件
├── next.config.mjs                # Next.js 配置
├── next-sitemap.config.js         # 站点地图自动生成配置
├── supabase/schema.sql            # 数据库建表 SQL
├── public/robots.txt              # 搜索引擎爬虫规则
└── src/
    ├── app/
    │   ├── layout.tsx             # 根布局
    │   ├── globals.css            # 全局样式 + Tailwind 主题
    │   ├── [locale]/              # ← 多语言路由
    │   │   ├── layout.tsx         # 区域布局（字体、Provider）
    │   │   ├── page.tsx           # 官网首页
    │   │   ├── about/page.tsx     # 关于我们
    │   │   ├── blog/
    │   │   │   ├── page.tsx       # 博客列表
    │   │   │   └── [slug]/page.tsx # 博客文章
    │   │   ├── pricing/page.tsx   # 定价页
    │   │   ├── privacy/page.tsx   # 隐私协议
    │   │   ├── terms/page.tsx     # 用户协议
    │   │   ├── sign-in/           # 登录页
    │   │   └── sign-up/           # 注册页
    │   └── api/
    │       ├── create-checkout-session/route.ts  # 创建支付会话
    │       └── webhooks/stripe/route.ts          # Stripe 回调处理
    ├── components/
    │   ├── Navbar.tsx             # 导航栏
    │   ├── LanguageSwitcher.tsx   # 语言切换按钮
    │   ├── PricingModal.tsx       # 定价弹窗
    │   └── landing/               # 首页各区块组件
    ├── i18n/                      # 国际化配置
    ├── lib/
    │   ├── stripe.ts              # Stripe 客户端
    │   └── supabase.ts            # Supabase 客户端
    └── messages/
        ├── en.json                # 英文翻译
        └── zh.json                # 中文翻译
```

---

## 多语言支持

项目内置中文和英文，所有页面内容通过 JSON 翻译文件管理。

**添加新语言只需 4 步：**

1. 在 `src/i18n/routing.ts` 的 `locales` 数组中添加语言代码（如 `ja`）
2. 创建翻译文件 `src/messages/ja.json`（复制 `en.json` 改内容）
3. 在 `src/components/LanguageSwitcher.tsx` 中添加语言标签
4. 在 `next-sitemap.config.js` 中添加 `alternateRefs`

---

## SEO 优化

项目从技术 SEO 和内容 SEO 两个维度进行了优化：

**技术 SEO：**
- 服务端渲染（SSR），搜索爬虫能直接抓到完整 HTML
- 自动生成 XML Sitemap（站点地图）
- robots.txt 配置
- 每个页面独立的 canonical URL（规范链接）
- hreflang 标签（告诉搜索引擎不同语言版本的对应关系）
- 安全头（X-Frame-Options, X-Content-Type-Options 等）
- DNS Prefetch 和字体预加载
- 图片格式优化（AVIF / WebP）

**内容 SEO：**
- 每个页面独立的 title 和 description 元标签
- Open Graph + Twitter Card 标签（社交分享优化）
- JSON-LD 结构化数据：
  - `Organization` — 组织信息
  - `WebSite` — 网站信息 + 站内搜索
  - `FAQPage` — FAQ 问答（首页）
  - `BlogPosting` — 博客文章
  - `BreadcrumbList` — 面包屑导航
- 语义化 HTML（正确的 H1→H2→H3 层级）
- 每篇博客文章都有独立的结构化数据

---

## 部署到 Vercel

1. 把代码推送到 GitHub
2. 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录
3. 点击 **「Import Project」**，选择你的仓库
4. 在 **「Environment Variables」** 中，把 `.env.local` 里的每一对键值都添加上去
5. 点击 **「Deploy」**

> 💡 部署完成后，记得把 `NEXT_PUBLIC_APP_URL` 改成你的正式域名，并在 Stripe 中添加正式环境的 Webhook 端点。

---

## 上线前检查清单

- [ ] 所有环境变量已配置真实值
- [ ] Stripe 已从 Test 模式切换到 Live 模式
- [ ] Stripe Webhook 已配置正式域名
- [ ] Supabase 数据库表已创建
- [ ] `NEXT_PUBLIC_APP_URL` 已改为正式域名
- [ ] 隐私协议和用户协议中的公司信息已替换
- [ ] 翻译文件中的品牌名称和联系方式已更新

---

## 常见问题

**Q: 没有配 Clerk/Stripe 密钥能运行吗？**
A: 可以。项目做了优雅降级处理，没有真实密钥时认证和支付功能会自动跳过，但你仍然能看到完整的 UI。

**Q: 可以用其他支付平台替代 Stripe 吗？**
A: 可以。支付层是模块化设计的，你可以在 `src/lib/stripe.ts` 和 API 路由中替换为其他支付 SDK。

**Q: 可以部署到 Vercel 以外的平台吗？**
A: 可以。这是标准的 Next.js 应用，可以部署到 AWS、Netlify、Docker 或任何支持 Node.js 的平台。

---

---

<p align="center">
  由 <a href="https://NowBuild.ai"><strong>NowBuild.ai</strong></a> 出品 · 帮你更快地构建 SaaS 产品
</p>

## License

MIT — 可以自由使用、修改和商用。
