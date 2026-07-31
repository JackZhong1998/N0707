# Campaign 后台任务部署

代码使用「数据库队列 + 分步 Worker」。用户离线续跑请同时阅读：

- [离线 Worker / cron-job.org](./OFFLINE_WORKER_CRON.md)

## 1. 执行数据库迁移

在正确的 Supabase 项目打开 SQL Editor，完整执行：

1. `supabase/migrations/20260729000000_add_resumable_campaign_jobs.sql`
2. `supabase/migrations/20260731000000_add_channel_plan_jobs.sql`（Launch Partner 渠道计划）
3. `supabase/migrations/20260731010000_add_agent_work_jobs.sql`（通用 Director 后台 LLM 队列）

迁移可重复执行，不会删除现有业务数据。它会：

- 补齐 `gtm_projects.state_revision` 和 `state_snapshot`
- 补齐 Agent Context 的持久化字段
- 创建 `campaign_jobs` / `campaign_job_steps` 与 `agent_work_jobs` / `agent_work_steps`
- 创建幂等入队、原子领取、租约续期、步骤完成/失败及任务释放函数
- 启用 RLS，并只允许 `service_role` 访问任务数据

## 2. 配置 Worker 恢复密钥

在 Vercel 的 Production、Preview 环境变量中增加：

```text
CRON_SECRET=<至少 32 位随机字符串>
```

**推荐（完全离线续跑）**：用 [cron-job.org](https://cron-job.org) 每 1–2 分钟请求：

`https://你的域名/api/internal/campaign-worker`  
Header：`Authorization: Bearer $CRON_SECRET`

详见 [OFFLINE_WORKER_CRON.md](./OFFLINE_WORKER_CRON.md)。

Hobby 自带 Cron 每天只能 1 次，只适合兜底：

```text
/api/internal/campaign-worker
schedule: 0 2 * * *   # 每天约 02:00 UTC
```

浏览器回页仍会触发 drain，但不能替代外部闹钟。

## 3. 验证数据库

迁移完成后在项目目录运行：

```bash
npm run db:campaign-smoke
```

全部字段应为 `true`。测试会使用随机临时用户验证：

- 完整状态快照
- 重复入队幂等
- 确定性步骤图
- Worker 排他领取
- 步骤结果持久化
- 失败重试与断点续跑
- 匿名访问隔离
- 测试数据自动清理

最后执行：

```bash
npm run build
```
