(function installNowBuildDirectoryCatalog(global) {
  const directories = [
    {
      id: 'uneed',
      name: 'Uneed',
      submitUrl: 'https://www.uneed.best/submit-a-tool',
      hosts: ['uneed.best'],
      pricing: 'Free + Paid',
      entryStage: 'url_preview',
      notes: '第一步无需账号；填写名称和网址后由平台抓取，再进入完整资料页。',
    },
    {
      id: 'peerpush',
      name: 'PeerPush',
      submitUrl: 'https://peerpush.com/submit',
      hosts: ['peerpush.com'],
      pricing: 'Free + Paid',
      entryStage: 'full_form',
      notes: '需要先登录；支持 URL 自动抓取或手工填写完整产品资料。',
    },
    {
      id: 'openhunts',
      name: 'OpenHunts',
      submitUrl: 'https://openhunts.com/projects/submit',
      hosts: ['openhunts.com'],
      pricing: 'Free + Paid',
      entryStage: 'full_form',
      notes: '需要先登录，随后进入项目提交表单。',
    },
    {
      id: 'toolfio',
      name: 'Toolfio',
      submitUrl: 'https://toolfio.com/submit',
      hosts: ['toolfio.com'],
      pricing: 'Free + Paid',
      entryStage: 'plan_then_form',
      safePlanPattern: '^Select Free$',
      blocker: '免费方案要求站点达到平台条件并添加永久徽章；插件不会修改产品官网。',
      notes: '先选择方案；默认只进入免费方案，不触发付款。',
    },
    {
      id: 'earlyhunt',
      name: 'EarlyHunt',
      submitUrl: 'https://earlyhunt.com/submit',
      hosts: ['earlyhunt.com'],
      pricing: 'Free + Paid',
      entryStage: 'full_form',
      notes: '表单由客户端加载；适配器会等待真实字段出现。',
    },
    {
      id: 'twelve_tools',
      name: 'Twelve Tools',
      submitUrl: 'https://twelve.tools/submit-your-tool',
      hosts: ['twelve.tools'],
      pricing: 'Free + Paid',
      entryStage: 'full_form',
      blocker: '免费方案要求在产品官网添加 Twelve Tools 的反向链接；插件不会修改产品官网。',
      notes: '直接打开已经核实的免费提交表单，不进入 Stripe 付款。',
    },
  ];

  global.NowBuildDirectoryCatalog = {
    version: '0.7.0',
    directories,
    byId(id) {
      return directories.find((directory) => directory.id === id);
    },
    byHost(hostname) {
      return directories.find((directory) =>
        directory.hosts.some(
          (host) => hostname === host || hostname.endsWith(`.${host}`)
        )
      );
    },
  };
})(globalThis);
