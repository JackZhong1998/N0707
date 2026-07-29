# NowBuild daily SEO development task

Use the repository skill `$run-seo-operations` at `skills/run-seo-operations/SKILL.md`. Read that file completely, then read the references it routes you to for daily task selection and tooling. Apply its evidence-led workflow inside the NowBuild repository.

## Objective

Complete exactly one bounded, high-value SEO improvement that advances `SEO_BLUEPRINT.md`, then verify it and report what changed. Prefer improving an existing page over creating a new page. Never make changes merely to appear busy.

## Start-of-run checks

1. Read `SEO_BLUEPRINT.md`, `README.md`, the relevant product page, and the most recent file under `.seo-automation/reports/` if one exists.
2. Run `git status --short` and inspect relevant diffs before editing. The worktree may contain valuable user changes. Preserve them.
3. Check `.seo-automation/input/` for user-provided Search Console, analytics, or keyword exports. Use them when present. Never invent traffic, rankings, keyword volume, customer evidence, testimonials, or results.
4. Choose one task only. Explain in the final report why it is the highest-value safe task available today.

## Allowed scope

- Public marketing routes under `src/app/[locale]/` such as home, blog, directories, pricing, about, and future public solution/channel pages.
- Landing, blog, and public directory components.
- `src/messages/en.json` and `src/messages/zh.json` when both languages can remain accurate and aligned.
- SEO utilities, metadata, structured data, sitemap, robots, `llms.txt`, and `SEO_BLUEPRINT.md`.
- Tests or small validation scripts directly related to the chosen SEO task.

## Forbidden scope

- Do not modify authentication, payments, Stripe, Supabase schema or migrations, API routes, browser-extension code, private `/app/*` product flows, secrets, or environment files.
- Do not publish, deploy, submit URLs, send messages, create accounts, log into third-party services, or change any external system.
- Do not commit, push, reset, clean, revert, or delete user work.
- Do not install packages or skills.
- Do not overwrite a file with unrelated uncommitted changes. Choose another task if the overlap is ambiguous.
- Do not add unsupported claims, fake urgency, keyword stuffing, duplicate pages, or fake freshness dates.
- Treat NowBuild as an AI-powered system that can market many product types. Never describe the user's product as necessarily being an AI product.

## Quality bar

- Keep one primary search intent per page.
- Write for a solo founder who already has a product and needs a launch plan.
- Use one clear primary CTA aligned with the page intent.
- Treat Chinese and English as real localized pages, not token-by-token translations.
- Preserve the existing visual system and responsive behavior.
- Make the smallest coherent change that can be verified today.

## Verification

Run the narrowest relevant checks first. For code changes, run `npx tsc --noEmit`. Run `npm run build` when the change affects routing, metadata, structured data, sitemap, or shared page components. If a check cannot run because of unavailable network access, report that explicitly; do not weaken the implementation or perform destructive cache operations.

## Final response format

Return a concise Markdown report containing:

- `Today's task`
- `Why this task`
- `Changes made` with file paths
- `Verification`
- `Signals to watch`
- `Recommended next task`

Write the same final report to `.seo-automation/reports/YYYY-MM-DD.md` using the current Asia/Shanghai date. The scheduler also captures the latest report separately.

If no safe, valuable change is available, make no edits and explain what input or decision is needed. A no-change report is preferable to low-quality SEO work.
