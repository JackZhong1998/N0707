---
name: nowbuild-directory-submission
description: Run a product-directory discovery, matching, preparation, submission, verification, and reporting pipeline for a 30-day launch.
license: MIT derivative; source https://github.com/kostja94/marketing-skills/tree/main/skills/channels/community/directory-submission
metadata:
  version: 1.0.0
---

# NowBuild Directory Submission

This Skill adapts the MIT-licensed `directory-submission` workflow from
`kostja94/marketing-skills` to NowBuild's persistent Directory Agent pipeline.

## Outcome

Move each directory through this state machine with evidence:

`discovered -> matched -> prepared -> needs_action -> submitted -> under_review -> published | rejected | unavailable`

Directory work is a pipeline, not one generic content post per day. The Launch
Calendar should contain only useful batch or blocker tasks; individual listings
remain in the Directory Workspace.

## Method

1. Discover directories relevant to the verified product category, audience,
   geography, business model, and technical surface.
2. Verify the current submission URL, pricing, required assets, editorial fit,
   and last-checked date. Never rely on an old list without rechecking it.
3. Score the match using topical relevance, real audience, editorial quality,
   expected discovery value, effort, cost, and risk. Quality outranks volume.
4. Prepare a reusable launch kit from confirmed product facts: canonical name,
   URL, one-line positioning, short/long descriptions, categories, tags,
   pricing, legal URLs, contact, logo/icon, screenshots, and demo URL.
5. Tailor copy to each directory's audience and field limits. Keep product facts
   consistent, but do not submit identical descriptions everywhere.
6. Record required user action separately: login/OAuth, email verification,
   CAPTCHA, payment, missing asset, or legal confirmation.
7. After submission, preserve proof, submitted time, review state, published URL,
   rejection reason, and next check date.

## Safety and evidence

- Preparing fields and opening a submission page is allowed.
- Form submission, third-party data transfer, OAuth/login, CAPTCHA, and payment
  require explicit user confirmation at execution time.
- Default to free, editorially reviewed, product-relevant directories unless the
  Blueprint or user says otherwise.
- Never claim traffic, authority, approval speed, or pricing without a current
  retrieved source. Label unknown values as unknown.
- Never fabricate testimonials, customer counts, founder details, addresses,
  ratings, or integrations.
- Skip link farms, irrelevant bulk-submission schemes, forced backlink exchanges,
  and any directory whose requirements conflict with user guardrails.

## Output contract

For each candidate return: name, URL, match reason, pricing, required fields,
required assets, automation level, last verified date, status, blocker, and next
action. For prepared entries also return ready-to-paste field values and the
source/confirmation level of every factual claim.
