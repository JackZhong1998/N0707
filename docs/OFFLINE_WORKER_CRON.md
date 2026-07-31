# 离线后台 Worker（cron-job.org）

目标：用户关页、休眠、完全离线时，AI 任务仍继续跑。

## 原理

1. 浏览器只负责 **入队**（`POST /api/agents/work`）
2. 任务与步骤落在 Supabase（`agent_work_jobs` / `campaign_jobs`）
3. 外部闹钟定期访问 Worker URL，服务端 `drain` 推进步骤
4. 用户回来后拉 `/api/gtm/state` 看结果

全站 **共用一个** cron，不是每个用户一个。

## 1. 执行数据库迁移

在 Supabase SQL Editor 依次执行（可重复）：

1. `supabase/migrations/20260729000000_add_resumable_campaign_jobs.sql`
2. `supabase/migrations/20260731000000_add_channel_plan_jobs.sql`
3. `supabase/migrations/20260731010000_add_agent_work_jobs.sql`

## 2. 配置密钥

Vercel（Production / Preview）与 `.env.local`：

```text
CRON_SECRET=<至少 32 位随机字符串>
```

## 3. 在 cron-job.org 创建任务

1. 注册 [cron-job.org](https://cron-job.org)
2. Create cronjob：
   - **URL**: `https://www.nowbuild.ai/api/internal/campaign-worker`
     （必须写最终域名。裸域 `nowbuild.ai` 会 307 跳到 `www`，跳转过程中 `Authorization` 头会被丢掉，导致 401。）
   - **Schedule**: every **2 minutes**（早期可用 1–5 分钟）
   - **Request method**: `GET` 或 `POST`
   - **Headers**:
     - Name: `Authorization`
     - Value: `Bearer <与 CRON_SECRET 完全相同>`
3. 保存并启用

cron-job.org 约 30 秒就会掐断响应，所以 Worker 收到请求后立即返回 `{"ok":true,"mode":"async"}`，
真正的 drain 在 `after()` 里继续跑满函数生命周期，不受调度器超时影响。

可选：保留 Vercel 自带 Cron（每天 1 次）作兜底；真正离线续跑靠 cron-job.org。

## 4. 验证

手动（`wait=1` 会同步跑完再返回，仅用于调试）：

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.nowbuild.ai/api/internal/campaign-worker?wait=1"
```

期望 JSON 含 `ok: true`，以及 `campaign` / `work` 的 `outcome` 与 `stepsProcessed`。
返回 `{"error":"Unauthorized"}` 说明线上 `CRON_SECRET` 与请求里的不一致——改完环境变量必须
**重新部署**才会生效。

产品内：入队一个长任务 → 关掉页面 → 几分钟后回来，进度应已前进。

## 覆盖范围

| 路径 | 离线可跑 |
|---|---|
| Director 派发的后台动作（渠道计划 / Todo / 推荐 / 选题 / 研究 / 周报 / 写稿等） | 是（`agent_work_*`） |
| 付费整包 Campaign 构建 | 是（`campaign_jobs`） |
| 前台 Director 对话本身 | 否（需要用户发消息） |
| 未付费本地 demo 回退 | 仍可能走浏览器 |

## 扩容

用户变多时 **不要** 给每人加 cron。同一 URL 可：

- 加密到每 1 分钟
- 提高 `drain` 预算内处理步数
- 把 Worker 迁到更长超时的主机，仍由同一闹钟叫醒
