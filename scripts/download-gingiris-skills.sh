#!/usr/bin/env bash
# Download Gingiris skills from https://gingiris.tools/skills/
# Primary source: Gingiris-1031/gingiris-skills monorepo (60 skills)
# Fallback: individual repos for skills not in monorepo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/gingiris-skills"
REPO_DIR="$ROOT/vendor/gingiris-skills-repo"

WEBSITE_41=(
  gingiris-launch product-hunt-playbook product-hunt-launch-guide startup-launch
  startup-launch-playbook ai-launch-playbook ai-product-launch go-to-market-playbook
  gingiris-seo-geo-agent gingiris-seo-geo gingiris-b2b-growth saas-growth-playbook
  plg-playbook b2b-marketing-playbook saas-marketing-playbook gingiris-opensource
  github-stars-playbook gingiris-github-star-growth open-source-marketing-playbook gr-readme
  gingiris-aso-growth aso-playbook hardware-saas-gtm gingiris-kol-outreach kol-outreach
  gingiris-ugc-matrix community-ambassador-playbook community-building-playbook devrel-playbook
  developer-marketing-playbook gingiris-reddit-marketing gingiris-twitter-agent-ops
  gingiris-user-interview competitor-research-playbook startup-consultant startup-growth-playbook
  startup-marketing-playbook viral-marketing-playbook growth-hacking-playbook
  gingiris-growth-finder agent-workflow-playbook
)

echo "==> Clone / update gingiris-skills monorepo"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" pull --depth 1 origin main
else
  git clone --depth 1 https://github.com/Gingiris-1031/gingiris-skills.git "$REPO_DIR"
fi

mkdir -p "$DEST"

echo "==> Copy all skills from monorepo"
python3 <<PY
import json, os, shutil

root = "$ROOT"
dest = "$DEST"
mono = os.path.join(root, "vendor/gingiris-skills-repo/skills")
website = set(${WEBSITE_41[@]!r})  # noqa - bash injects below

website_list = """${WEBSITE_41[*]}""".split()

def copy_skill(name, src):
    d = os.path.join(dest, name)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(src, d)

from_mono = []
for name in sorted(os.listdir(mono)):
    src = os.path.join(mono, name)
    if os.path.isdir(src) and os.path.isfile(os.path.join(src, "SKILL.md")):
        copy_skill(name, src)
        from_mono.append(name)

missing = [s for s in website_list if s not in from_mono]
manifest = []
for name in sorted(os.listdir(dest)):
    skill_md = os.path.join(dest, name, "SKILL.md")
    if os.path.isfile(skill_md):
        with open(skill_md, encoding="utf-8") as f:
            content = f.read()
        manifest.append({
            "skillId": name,
            "path": f"vendor/gingiris-skills/{name}",
            "hasReferences": os.path.isdir(os.path.join(dest, name, "references")),
            "sizeBytes": len(content.encode("utf-8")),
            "onWebsite": name in website_list,
        })

with open(os.path.join(dest, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump({
        "source": "https://gingiris.tools/skills/",
        "monorepo": "https://github.com/Gingiris-1031/gingiris-skills",
        "websiteCount": len(website_list),
        "count": len(manifest),
        "fromMonorepo": from_mono,
        "missingFromMonorepo": missing,
        "skills": manifest,
    }, f, indent=2)

print(f"Copied {len(manifest)} skills ({len(from_mono)} from monorepo)")
if missing:
    print(f"Missing from monorepo (need individual fetch): {missing}")
PY

# Fallback: fetch skills only in separate repos
for skill in gingiris-reddit-marketing; do
  if [ ! -f "$DEST/$skill/SKILL.md" ]; then
    echo "==> Fetch $skill from individual repo"
    mkdir -p "$DEST/$skill"
    curl -fsSL "https://raw.githubusercontent.com/Gingiris-1031/$skill/main/SKILL.md" \
      -o "$DEST/$skill/SKILL.md" || echo "  failed: $skill"
  fi
done

echo "==> Done. Skills at $DEST"
