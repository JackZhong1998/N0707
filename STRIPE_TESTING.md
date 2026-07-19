# Stripe + Supabase 本地测试

项目的 Checkout 是真实 Stripe Test mode 订阅流程；Webhook 会校验原始请求签名，并把订阅与事件幂等记录写入 Supabase。

## 1. 先建表

在 Supabase Dashboard 的 SQL Editor 执行 `supabase/schema.sql`。该迁移可重复执行，会从旧版单表订阅结构升级到完整业务模型。

应包含这些表：

- `app_users` / `gtm_projects`：Clerk 用户映射和 GTM 项目
- `project_contexts`：用户档案、项目档案和上下文同步进度
- `conversations` / `messages`：市场总监与渠道专员对话
- `market_strategies` / `channel_strategies` / `project_channels`：市场策略与渠道选择
- `todos`：30 天行动日历、状态和内容草稿
- `subscriptions` / `stripe_events`：订阅状态与 Webhook 幂等记录
- `ai_usage_events`：逐请求 AI 用量和成本账本

执行迁移后可运行自动化验收：

```bash
npm run db:smoke
npm run stripe:webhook:smoke
```

两个命令都只创建临时测试记录，并在完成后自动清理。

## 2. 检查环境变量

`.env.local` 至少需要：

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxx

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# 新项目推荐 sb_secret_…；旧项目可继续用 service_role
SUPABASE_SECRET_KEY=sb_secret_xxx
# SUPABASE_SERVICE_ROLE_KEY=eyxxx
```

`STRIPE_WEBHOOK_SECRET` 不需要写入文件，下面的脚本会为每次本地会话生成。

## 3. 一条命令启动

运行：

```bash
npm run dev:stripe
```

脚本会从 `.env.local` 内存读取 `STRIPE_SECRET_KEY`，确保 CLI 和应用使用同一个 Test 账号（无需额外 `stripe login`）。它会启动同一个 Stripe listener，从它获取临时 `whsec_…`，只注入本次 Next.js 进程，然后转发事件到：

```text
http://localhost:3000/api/webhooks/stripe
```

按 `Ctrl+C` 会同时停止 Next.js 和 listener。

如果提示 3000 端口已占用，请先停止旧的 `npm run dev` 进程，再运行
`npm run dev:stripe`。脚本不会自动改用其他端口，避免 Webhook 被转发到旧进程。

## 4. 端到端验收

1. 打开 `http://localhost:3000/zh/app/calendar`，用 Clerk 测试用户登录。
2. 点击支付墙并进入 Stripe Checkout。
3. 使用成功测试卡 `4242 4242 4242 4242`，未来有效期、任意 CVC 和邮编。
4. 支付后会回到行动日历。页面会在短时间内重试读取订阅，Webhook 落库后自动解锁。
5. 在 Supabase 确认：
   - `subscriptions.status` 是 `active` 或 `trialing`
   - `stripe_events.status` 是 `processed`
   - 用户对话后，`conversations` 和 `messages` 有数据
   - 生成策略后，策略表和 `todos` 有数据

## 5. 事件回归测试

可在另一终端触发 Stripe fixture：

```bash
stripe trigger customer.subscription.updated
```

这类通用 fixture 没有 NowBuild 的 `clerk_user_id` 元数据，因此用来测签名和错误重试即可；订阅业务映射应以真实 Checkout 流程验收。

## 6. 安全要点

- 只使用 `sk_test_` 做本地测试。
- Supabase secret/service-role key 只在 Next.js 服务端创建的 client 中使用。
- 前端提交的 `paid` 值不会写入订阅表；解锁权限始终由 Stripe Webhook 同步的订阅状态决定。
- 生产 Webhook 需在 Stripe Workbench 配置公网 HTTPS endpoint 和独立的签名 Secret。
