# NowBuild 发布助手

这是一个无账号、无 AI 调用的 Manifest V3 Chrome 插件。它接收一次性发布或
数据回收指令，在用户已经登录的平台页面中执行动作，并把结果返回调用方。

插件内置独立执行测试台，可以在不打开 NowBuild 主站的情况下验证每个平台的
填写、发布、结果 URL 和公开指标回收能力。

## 本地安装

1. 打开 `chrome://extensions`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本目录 `browser-extension`
5. 刷新已经打开的 NowBuild 页面

## 独立执行测试台

1. 点击浏览器工具栏中的「NowBuild 发布助手」
2. 点击「打开执行测试台」
3. 选择平台并载入示例内容；测试 X 时选择普通账号或 Premium
4. 普通 X 账号会按 280 加权字符自动拆成 Thread；实际已开通 Premium 的账号可保持为一条长帖
5. 使用 Dry Run 只填写不发布；使用 Live Test 时由用户在平台页面最终确认发布
6. 在「数据回收测试」中粘贴已发布内容的 URL，可单独测试公开指标读取

测试台能够显示实时状态、查看插件临时任务、取消执行并导出诊断 JSON。诊断报告
不包含 Cookie、密码、OAuth Token 或页面完整 HTML。

## MVP 支持范围

- X：普通账号按完整句子优先拆分并填写 Thread，标签只追加到最后一条；Premium 填写单条长帖，用户最终确认发布
- 小红书：自动执行“文字配图”、生成默认封面、填写标题和正文，用户最终确认发布
- X / 小红书：从已发布帖子页面读取当前可见的公开互动指标；X 同时读取浏览量
- 海外平台 Beta：Hacker News、DEV、Reddit、LinkedIn、Medium、Hashnode、Indie Hackers
- Beta 平台统一支持登录状态检查、打开真实编辑页、填写后停在最终发布前、公开指标试读和诊断报告
- Product Launch Kit：统一准备产品名称、网址、Slogan、长短介绍、分类、定价、创始人资料、Logo 和截图
- 目录提交 Beta：Uneed、PeerPush、OpenHunts、Toolfio、EarlyHunt、Twelve Tools
- 目录任务支持登录后继续、图片上传、必填项检查，并区分登录、CAPTCHA、人工字段、付款与反向徽章阻塞
- 插件测试台：Dry Run、Live Test、指标测试、临时任务查看和诊断导出

插件不会保存账号密码、Cookie、市场策略或内容历史。发布任务只在执行期间保存，
完成后立即移除。

插件使用 Chrome 的 `debugger` 权限调用浏览器原生文字输入，以兼容 X、Medium、
LinkedIn 等富文本编辑器。插件只在填写当前编辑框时临时连接对应标签页，输入完成后立即断开；
不会读取网络请求、Cookie、密码或浏览历史。

## Beta 测试顺序

建议先登录目标平台，再从执行测试台逐个运行 Dry Run。Reddit 最好填写社区名；
Medium 与 Hashnode 可能自动保存平台草稿。所有 Beta 适配器都不会自动点击最终发布。
失败时下载诊断 JSON，并记录当时页面截图，便于只修复对应平台规则。

目录测试同样只运行 Dry Run。插件可以进入免费的资料填写阶段，但不会购买付费方案、
勾选未经用户确认的条款、完成 CAPTCHA，或替用户修改产品官网来添加反向徽章。
