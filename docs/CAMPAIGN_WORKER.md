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

主恢复路径（推荐，Hobby 可用）：

- 浏览器轮询或回到页面时会触发 Worker；每次触发会在服务端 `after()` 内连续推进多个步骤（约 4 分钟预算），因此短暂切换应用通常不会打断已启动的组装
- 用户长时间离开后，前端 `ResumeOnReturn` 会自动拉取 `/api/gtm/state`，并对付费用户调用 `/api/gtm/campaign-jobs` 继续 Worker
- 同步失败时提示刷新页面

`vercel.json` 另配置每天一次 Cron 作兜底（Hobby 限制：不能超过每天 1 次）：

```text
/api/internal/campaign-worker
schedule: 0 2 * * *   # 每天约 02:00 UTC
```

浏览器轮询 / 回到页面时也会触发 Worker。若需要用户完全离线时仍每分钟推进任务，请升级 Vercel Pro。

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
