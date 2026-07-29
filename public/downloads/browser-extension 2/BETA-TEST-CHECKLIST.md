# NowBuild Publisher 0.6.1 Beta 测试清单

## 测试前

1. 在 `chrome://extensions` 重新加载插件，确认版本显示为 `0.6.1`。
2. 先分别登录要测试的平台，不要让插件代替你执行 Google 登录。
3. 从插件弹窗打开「执行测试台」，只使用 `Dry Run`。
4. 每个平台测试结束后检查页面内容，然后关闭该平台标签页；不要点击最终发布。
5. 若失败，下载诊断 JSON，并保存平台页面截图。

## 建议顺序与成功标准

| 顺序 | 平台 | 测试前准备 | Dry Run 成功标准 |
| --- | --- | --- | --- |
| 1 | Hacker News | 登录 HN | 标题和 URL 被填入，停在 submit 前；URL 投稿不填正文 |
| 2 | DEV Community | 登录 DEV | 标题、Markdown 正文、最多 4 个标签被填入，停在 Publish 前 |
| 3 | Reddit | 登录 Reddit；测试台填写社区名 | 打开指定社区 Text Post，标题和正文被填入，停在 Post 前 |
| 4 | LinkedIn | 登录 LinkedIn | 发帖弹窗打开，正文、URL、标签被填入，停在 Post 前 |
| 5 | Medium | 登录 Medium | 新文章标题和正文被填入；允许 Medium 自动保存草稿，不发布 |
| 6 | Hashnode | 登录并至少创建一个 Publication | 从 Feed 自动点击 Write、创建草稿并填写标题与正文；不发布 |
| 7 | Indie Hackers | 登录并拥有发帖权限 | 进入 `/new-post` 并填写；无权限时返回 `account_posting_permission`，不再等待超时 |

## 数据回收

先手工粘贴一条已经公开发布的 URL，再点击「获取公开数据」。第一轮的目标是验证：

- URL 域名校验正确；
- 帖子页面能在后台打开；
- 能识别平台当前公开展示的至少一种指标；
- 失败时返回明确错误，不读取 Cookie、接口 Token 或私有分析页。

Medium 自定义域名暂不纳入本轮；Hashnode 自定义域名会在首次采集时请求该站点的只读页面权限。

## 失败报告中最重要的内容

- `adapterVersion`
- 最后一个成功状态和失败时间
- 完整错误文字
- 当时页面停在哪一步（登录页、选择社区、空编辑器、已填一半、发布设置页）
- 页面截图
