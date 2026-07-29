# NowBuild 0.6.1 · 目录提交 Beta 测试

## 测试前

1. 在 `chrome://extensions` 重新加载插件，确认版本为 `0.6.1`。
2. 从插件弹窗打开执行测试台，滚动到 `Product Launch Kit · 目录 Dry Run`。
3. 替换示例文字资料；Logo 和每张截图建议小于 1.5MB。
4. 每次只测试一个目录，不点击最终 Submit、购买、付款或确认条款。
5. 失败时下载诊断 JSON，并保留页面截图。

## 推荐顺序

| 顺序 | 目录 | 首屏流程 | 本轮成功标准 |
| --- | --- | --- | --- |
| 1 | Uneed | 名称 + URL 预抓取 | 自动填写名称和网址，停在 Preview 前 |
| 2 | Twelve Tools | 直接打开免费表单 | 填写 Logo、URL、名称、Headline、Description、Category、Email；不勾选反向链接确认 |
| 3 | EarlyHunt | 动态加载提交表单 | 能识别并填写当前页面已有字段 |
| 4 | OpenHunts | 先登录 | 日志返回 `needs_user_action`；登录跳转后自动继续填写 |
| 5 | PeerPush | 先登录 | 登录后进入 URL 抓取或完整产品资料页并填写 |
| 6 | Toolfio | 先选择方案 | 只进入 Free 方案，不进入付款；填写资料后报告徽章阻塞 |

## 状态含义

- `prepared`：可自动填写的字段已完成，页面保留供检查。
- `needs_user_action · login`：需要用户在当前标签页登录。
- `needs_user_action · captcha`：需要用户完成人机验证。
- `manual_fields`：平台存在未匹配的必填字段、复杂分类或确认项。
- `site_requirement`：平台要求反向徽章、付费或站外操作。
- `failed`：入口或字段规则失效，需要根据截图和报告修适配器。

## 0.6.1 不会做的动作

- 不自动点击最终提交。
- 不自动登录 Google/GitHub。
- 不处理验证码、CAPTCHA 或 2FA。
- 不购买付费方案。
- 不自动勾选条款或反向链接声明。
- 不修改用户产品官网来添加目录徽章。
