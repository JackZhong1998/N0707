# Campaign 后台任务部署

代码已经改为“数据库队列 + 分步 Worker”。上线前只需要完成以下三步。

## 1. 执行数据库迁移

在正确的 Supabase 项目打开 SQL Editor，完整执行：

`supabase/migrations/20260729000000_add_resumable_campaign_jobs.sql`

迁移可重复执行，不会删除现有业务数据。它会：

- 补齐 `gtm_projects.state_revision` 和 `state_snapshot`
- 补齐 Agent Context 的持久化字段
- 创建 `campaign_jobs` 和 `campaign_job_steps`
- 创建幂等入队、原子领取、租约续期、步骤完成/失败及任务释放函数
- 启用 RLS，并只允许 `service_role` 访问任务数据

## 2. 配置 Worker 恢复密钥

在 Vercel 的 Production、Preview 环境变量中增加：

```text
CRON_SECRET=<至少 32 位随机字符串>
```

`vercel.json` 已配置每天调用一次（Hobby 套餐限制：cron 不能超过每天 1 次）：

```text
/api/internal/campaign-worker
schedule: 0 2 * * *   # 每天约 02:00 UTC（Hobby 实际触发可能在该小时内）
```

浏览器在线时也会触发 Worker；Cron 用于用户关闭页面后的兜底接管。若需要每分钟跑 Worker，请升级 Vercel Pro。

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
