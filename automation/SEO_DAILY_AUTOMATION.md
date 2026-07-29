# NowBuild SEO daily automation

The local macOS task `com.nowbuild.seo-daily` runs every day at 09:30 in the Mac's current timezone.

## What it does

- Loads the repository skill at `skills/run-seo-operations/SKILL.md`.
- Reads `SEO_BLUEPRINT.md`, the operating references, and the previous daily report.
- Inspects the working tree before editing.
- Completes at most one bounded public-SEO improvement.
- Runs relevant TypeScript/build checks.
- Writes the latest final report to `.seo-automation/latest.md`.
- Keeps dated reports under `.seo-automation/reports/YYYY-MM-DD.md`.
- Writes launch logs to `~/Library/Logs/nowbuild-seo-daily.stdout.log` and `nowbuild-seo-daily.stderr.log`.

The scheduled task launches the signed Codex executable directly. This avoids macOS privacy restrictions that block background shell processes from reading a project under `Documents`.

The task does not commit, push, deploy, publish, sign into third-party services, or modify auth, billing, databases, APIs, browser-extension code, or private product routes.

Put exported Search Console or analytics files in `.seo-automation/input/`. The next run will inspect them before choosing its task.

## Manage the task

Check status:

```bash
launchctl print gui/501/com.nowbuild.seo-daily
```

Run once immediately:

```bash
launchctl kickstart -k gui/501/com.nowbuild.seo-daily
```

Check local paths without starting an AI run:

```bash
./scripts/seo-daily.sh --check
```

Stop the recurring task:

```bash
launchctl bootout gui/501/com.nowbuild.seo-daily
```

Re-enable after updating the plist:

```bash
launchctl bootstrap gui/501 /Users/bytedance/Library/LaunchAgents/com.nowbuild.seo-daily.plist
```
