# NowBuild Agent Skill and Effect System

## Outcome

Channel quality is enforced by four layers rather than by installing more
prompt text:

1. **Platform Skill**: channel-native rules, formats, and community norms.
2. **Shared editorial Skill**: real author voice, specificity, and no
   fabrication.
3. **Shared research Skill**: search triggers, source hierarchy, and citation
   rules.
4. **Runtime evidence pack**: a fresh Tavily search before channel content is
   drafted, stored with the generated content.

The Director remains the sole orchestrator. Imported CMO/agent packages never
replace NowBuild ownership boundaries.

## Skill quality rubric (100 points)

| Dimension | Weight | Passing evidence |
| --- | ---: | --- |
| Task contract | 15 | Clear triggers, inputs, outputs, and stop conditions |
| Domain depth | 20 | Platform rules, examples, failure modes, and decisions |
| Evidence discipline | 20 | Freshness, original sources, citations, no fabrication |
| Safety and platform integrity | 15 | No deception, ban evasion, fake identity, or unsafe automation |
| Executability | 15 | Concrete checklist or structured workflow, not slogans |
| Maintainability | 10 | Version/source/license and bounded dependencies |
| Prompt efficiency | 5 | Useful instructions fit the worker's context budget |

- 85-100: install or directly map after a platform fit review.
- 70-84: retain upstream and create a compact NowBuild adapter.
- Below 70: reject from runtime mapping; useful fragments may be re-authored
  only with provenance and safety review.

Scores and decisions for the current imports live in
`vendor/external-skills/manifest.json`.

## Current channel coverage

Every channel receives:

- `custom/research-grounded-writing`
- `custom/authentic-editorial-voice`

Channel-specific examples:

- Reddit: `custom/reddit-community` (safe community-first replacement for the
  previously mapped playbook).
- Hacker News: `custom/hacker-news` plus the installed Sentry technical writing
  guide.
- X, LinkedIn, WeChat, Xiaohongshu, Product Hunt, SEO, GitHub, website, private
  outreach, directories, interviews, and research retain their existing
  platform playbooks plus the two shared contracts.

## Runtime research behavior

`runChannelWrite` now attempts research for every public content task.
Research-heavy task types use two queries; other tasks use one lightweight
query. Reddit, Hacker News, Product Hunt, and GitHub queries are automatically
scoped to their platform domains.

The evidence pack includes query time, title, URL, excerpt, optional publication
date, and relevance score. Retrieved text is explicitly treated as untrusted
data. If Tavily is unavailable or returns no results, the writer must lower the
claim strength and use only confirmed product facts.

Research metadata is stored on `Todo.content.research`, so later review and UI
work can show exactly what supported a draft.

## Evaluation loop

Skill presence is necessary but insufficient. Run the following evaluation set
before promoting a Skill change:

1. **Golden tasks**: at least 10 representative tasks per channel, including a
   normal post, a research-heavy post, a rewrite, and a missing-evidence case.
2. **Hard checks**: no invented facts, valid source URLs, correct language,
   required disclosure, platform length/format, and no prohibited tactics.
3. **Pairwise review**: blind-compare current vs candidate Skill outputs. Record
   factuality, usefulness, voice match, platform fit, and edit distance to
   publish-ready.
4. **Production feedback**: acceptance without edits, user rewrite rate,
   publish rate, moderation/removal rate, and downstream engagement. Never use
   an AI-detector score as a quality KPI.
5. **Regression gate**: a Skill only becomes default when it improves factuality
   and platform fit without increasing safety failures or prompt cost beyond the
   agreed budget.

Recommended product metrics:

- source coverage for material claims;
- unsupported-claim rate;
- user edit distance and rewrite count;
- publish-ready acceptance rate;
- platform moderation/removal incidents;
- per-draft latency, prompt tokens, search cost, and generation cost;
- channel-specific outcome metrics, interpreted as correlation rather than
  proof of causality.

## Maintenance

- Keep upstream packages immutable; update through `skill-installer`, then
  re-run the audit.
- Record the new commit, license, score, and decision in the external manifest.
- Put NowBuild-specific changes in `vendor/custom`, not inside upstream copies.
- Re-review platform rules and examples quarterly or after a material platform
  policy change.
- Treat any Skill containing account manipulation, disguised affiliation,
  coordinated voting, fabricated experience, or detector-evasion guarantees as
  a blocking review failure.

