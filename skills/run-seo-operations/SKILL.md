---
name: run-seo-operations
description: Operate evidence-led SEO as a long-term system across technical health, indexing, search performance, content quality, internal links, page experience, and conversion. Use when Codex needs to plan or execute daily, weekly, monthly, or quarterly SEO work; audit a website; triage Search Console exports; choose the next SEO action; improve existing pages; build topic clusters; validate metadata, canonical, hreflang, robots, sitemaps, or structured data; or automate recurring SEO development safely.
---

# Run SEO Operations

Treat SEO as an operating loop, not a publishing quota. Monitor frequently, change pages only when evidence or a deliberate strategy supports the change, and measure outcomes over useful time windows.

## Load the right references

- Read [references/operating-system.md](references/operating-system.md) when defining cadence, creating a long-term plan, or choosing today's task.
- Read [references/tools-and-signals.md](references/tools-and-signals.md) when selecting tools, interpreting metrics, or designing automation.
- Run [scripts/gsc_opportunities.py](scripts/gsc_opportunities.py) when a Search Console CSV export contains query/page performance data.

## Run the workflow

### 1. Establish the site objective

Record:

- business model and primary conversion;
- intended audience and markets;
- public page inventory and languages;
- one primary search intent per important page;
- analytics, Search Console, Bing, crawl, and deployment data currently available.

Do not infer keyword volume, rankings, traffic, revenue, or conversions when data is missing. Start with a baseline audit instead.

### 2. Inspect current state before editing

For a repository:

- read local instructions and product documentation;
- inspect `git status` and relevant diffs;
- preserve unrelated or uncommitted user work;
- identify public versus private routes;
- understand the framework's metadata, sitemap, robots, and internationalization behavior.

For a live site:

- verify HTTP status, rendering, canonical, robots directives, sitemap inclusion, structured data, mobile usability, and key internal links;
- compare the live result with repository intent when both are available.

### 3. Triage by impact

Choose the highest applicable class:

1. **Incident:** site unavailable, accidental `noindex`, robots block, broken canonical, bad redirect, widespread 4xx/5xx, or public pages missing after a deployment.
2. **Indexing defect:** intended pages excluded, private or duplicate pages indexed, sitemap conflicts, hreflang errors, or duplicate URL variants.
3. **Existing demand:** pages with impressions and average positions roughly 8–30, high-impression low-CTR pages, or pages losing qualified traffic.
4. **Conversion mismatch:** organic landing pages attract relevant users but fail to move them to the next useful action.
5. **Content gap:** a business-relevant intent has no credible owner page.
6. **Expansion:** new topic clusters, comparisons, channels, or languages after higher-priority work is healthy.

Prefer improving a page with demonstrated demand over creating a speculative page.

### 4. Select one bounded action

Define before editing:

- page or system affected;
- evidence supporting the action;
- user/search intent;
- exact change;
- validation method;
- success signal and observation window.

Daily execution should usually complete one coherent action. A no-change report is valid when data is noisy, the site is healthy, or the proposed change lacks evidence.

### 5. Implement safely

Apply the smallest useful change. Examples:

- repair canonical, hreflang, robots, sitemap, or structured data;
- align title, description, H1, direct answer, headings, and CTA with one intent;
- add relevant internal links from authoritative pages;
- consolidate overlapping content instead of creating another competing page;
- add first-hand evidence, examples, screenshots, methodology, or limitations;
- improve rendering, accessibility, or performance that blocks users or crawlers.

Never create fake freshness, unsupported claims, keyword stuffing, doorway pages, mass-generated thin content, or invented FAQ questions.

### 6. Validate proportionally

Use the narrowest relevant checks, then expand when risk warrants:

- syntax, type, and unit checks;
- production build for routing or shared metadata changes;
- rendered desktop and mobile inspection;
- HTTP status, canonical, alternate, robots, sitemap, and JSON-LD checks;
- live URL Inspection or Rich Results Test when access exists;
- post-deployment monitoring for indexing and conversion signals.

Do not declare ranking impact immediately. Search performance should normally be evaluated over weekly or monthly comparisons, accounting for seasonality, brand/non-brand mix, device, country, and query intent.

### 7. Report and preserve the loop

Return:

- task and reason;
- evidence used;
- files or URLs changed;
- validation results;
- signals to watch and observation window;
- recommended next action;
- unresolved risks or required human decisions.

## Automation boundaries

Automate:

- data collection and export parsing;
- uptime, status, metadata, sitemap, robots, and structured-data checks;
- opportunity scoring and anomaly alerts;
- small reversible repository changes;
- tests, builds, screenshots, and reports.

Require human review before:

- changing company/category positioning;
- publishing factual claims, case studies, or regulated/YMYL content;
- deleting, merging, redirecting, or deindexing many URLs;
- creating large numbers of pages;
- deploying, submitting URLs, or acting in third-party accounts;
- committing, pushing, or altering production data unless explicitly authorized.
