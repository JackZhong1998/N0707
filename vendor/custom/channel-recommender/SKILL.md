---
name: channel-recommender
description: Diagnose a project's launch conditions, recommend and prioritize a maintainable portfolio of supported marketing channels, and produce a 30-day market report plus Directory plan. Use when project information may be free-form or incomplete and recommendations must connect project evidence, audience behavior, channel mechanics, founder capacity, and explicit assumptions.
---

# Channel Recommender

Recommend a channel portfolio for this project, not a generic list of popular platforms. A strong recommendation explains why a specific audience would encounter, trust, and act on this specific product through each channel.

## Interpret free-form project information

Read the supplied project document, user profile, conversation, and campaign context as evidence even when they are prose rather than structured fields. Extract what is actually stated and separate it from assumptions.

Establish:

- product type and what is usable now;
- target user, buyer, and important use situation;
- painful problem and current alternatives;
- differentiation and available proof;
- growth stage and immediate bottleneck;
- market, language, and geographic constraints;
- founder skills, existing audience, time, and production capacity;
- conversion path from attention to use or purchase.

Do not reject the task because a field is missing. Make the smallest reasonable assumption, label it, and put its validation into the first phase. Never invent traction, budget, customers, expertise, or channel performance.

## Diagnose before choosing channels

Determine what distribution can solve now. If the product is not usable, the offer is unclear, or activation and retention are the obvious bottleneck, make validation or conversion work the first priority instead of prescribing more traffic.

Describe the current bottleneck in project-specific language. Avoid fixed revenue, retention, CAC, posting-frequency, or follower thresholds unless the user's own data supplies them.

## Evaluate every supported channel consistently

Judge channel fit across these dimensions:

1. **Audience presence:** Are the intended users plausibly concentrated or reachable there?
2. **Problem context:** Does the channel contain conversations or searches where the problem naturally appears?
3. **Proof and format fit:** Can the project demonstrate value in the channel's native format with available evidence?
4. **Trust path:** Can the user's identity, expertise, community participation, product proof, or search usefulness earn attention credibly?
5. **Conversion path:** Is there a reasonable step from the channel interaction to trying, contacting, or buying?
6. **Founder fit:** Can the user sustain the required writing, video, visual, community, research, or outreach work?
7. **Market fit:** Do language, geography, category norms, and access match the project?
8. **Learning speed and cost:** Can the channel test an important assumption within the available time and budget?

Treat `fitScore` as a relative explanation aid within this report, not a measured probability. The rationale must name the project fact, relevant channel behavior, and resulting action. A high score without that chain is invalid.

## Build a coherent portfolio

Give each recommended channel one role, such as:

- fast feedback or user discovery;
- demand capture from existing intent;
- public proof and credibility;
- repeatable education or founder voice;
- concentrated launch visibility;
- conversion surface;
- long-term searchable asset.

Select a maintainable number of primary channels from the user's capacity and any `maxActiveChannels` constraint. Use secondary channels to reinforce the same campaign, not to create unrelated content systems. Use explore for a bounded test with an explicit question. Use skip when audience, format, market, readiness, or capacity makes the channel a poor current bet.

For a solo founder with roughly five hours per week and no existing audience, normally choose only one or two primary channels, up to two secondary channels, and at most one bounded exploration. A primary channel consumes recurring weekly capacity; if the plan cannot show that capacity, lower its priority. More channels are not a stronger recommendation.

Treat one-time launch sites as milestones, not automatically as repeatable acquisition channels. Product Hunt or Hacker News may support a launch, but they should not become primary merely because the product is technical. Require launch readiness, a credible audience overlap, a conversion path, and enough maker capacity. Avoid unsupported phrases such as “ideal channel” or “successful launch can provide.”

Do not force every fashionable channel into the plan. Do not assume Product Hunt, SEO, LinkedIn, X, Reddit, short video, or any other channel is universally required. Respect preferred or existing channels, but explain when evidence supports changing their priority.

Match the target market language to each channel's supported locales. Skip a language- or geography-specific channel unless the project or user profile confirms suitable language ability, local audience access, or an existing presence there.

## Produce an executable 30-day report

Make the report independently useful. Include:

- an execution summary;
- product, audience, differentiation, readiness, and bottleneck diagnosis;
- the channel portfolio and the role of each channel;
- a four-phase Day 1–30 launch plan;
- Directory preparation and submission planning;
- success signals and continue/change/stop decisions;
- three actions that can begin now.

Sequence work by dependency. Early phases should resolve missing positioning, proof, access, or conversion-path issues. Later phases may expand distribution only when the earlier success signals support it. Write actions as concrete outputs or tests, not slogans such as “build awareness” or “go viral.”

Cadence must reflect the format and the user's capacity. Present it as an initial operating hypothesis to review, not an algorithmic law. Do not manufacture precise conversion targets without a baseline; define observable signals and the decision they inform.

## Keep Directory separate

Directory submission is a fixed execution capability, not a channel candidate. Exclude `directory` from recommendation scoring. Build a separate plan covering eligibility, reusable source materials, fit criteria, batching, status tracking, and coordination with credible launch milestones.

Do not promise acceptance, ranking, backlinks, or traffic. Do not invent a list of best-fit directories when the required directory data is not supplied.

## Preserve the output contract

Return only supported channel IDs from the supplied catalog. Cover every recommendable channel with `primary`, `secondary`, `explore`, or `skip`; explain skipped channels briefly. Keep structured fields consistent with the full Markdown report.

When revising after user feedback, preserve verified facts and valid constraints. Change the diagnosis or priority only when the feedback supplies a new fact, preference, capacity constraint, or strategic choice. Do not quietly rewrite the product or market to justify a new answer.

## Check before delivery

Confirm that:

- facts and assumptions are visibly separated;
- every primary channel has a distinct job and credible audience path;
- the portfolio fits the user's real capacity;
- rationales are specific to the project and channel;
- the four phases are continuous and dependency-aware;
- success signals lead to a continue, change, or stop decision;
- Directory is planned separately and absent from channel recommendations;
- no recommendation relies on unsupported universal benchmarks or platform myths.
