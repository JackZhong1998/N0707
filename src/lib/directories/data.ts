export type LaunchDirectory = {
  name: string;
  url: string;
  domain: string;
  image: string | null;
  dr: number;
  dofollow: boolean;
  pricing: 'Free' | 'Free + Paid' | 'Paid' | 'Unknown';
  tags: string[];
  upvotes: number;
  featured: boolean;
  sourceOrder: number;
};

// Public directory facts and logo URLs retrieved from launchdirectories.com on 2026-07-22.
// Cards fall back to initials when a source logo is absent or fails to load.
export const launchDirectories: LaunchDirectory[] = [
  {
    "name": "PeerPush",
    "url": "https://peerpush.net/",
    "domain": "peerpush.net",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/peerpush.webp",
    "dr": 74,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 119,
    "featured": true,
    "sourceOrder": 1
  },
  {
    "name": "Aura++",
    "url": "https://auraplusplus.com/",
    "domain": "auraplusplus.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/aura.webp",
    "dr": 71,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 66,
    "featured": true,
    "sourceOrder": 2
  },
  {
    "name": "Openhunts",
    "url": "https://openhunts.com/",
    "domain": "openhunts.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/openhunts.jpg",
    "dr": 63,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 19,
    "featured": true,
    "sourceOrder": 3
  },
  {
    "name": "Toolfio",
    "url": "https://toolfio.com/",
    "domain": "toolfio.com",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/toolfio-logo.webp",
    "dr": 59,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "software directory",
      "ai"
    ],
    "upvotes": 13,
    "featured": true,
    "sourceOrder": 4
  },
  {
    "name": "EarlyHunt",
    "url": "https://earlyhunt.com/",
    "domain": "earlyhunt.com",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/earlyhunt.webp",
    "dr": 57,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 15,
    "featured": true,
    "sourceOrder": 5
  },
  {
    "name": "hot100",
    "url": "https://www.hot100.ai/",
    "domain": "hot100.ai",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/hot100ai.webp",
    "dr": 52,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "ai"
    ],
    "upvotes": 15,
    "featured": true,
    "sourceOrder": 6
  },
  {
    "name": "Reddit",
    "url": "https://www.reddit.com/",
    "domain": "reddit.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/reddit.webp",
    "dr": 95,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "community"
    ],
    "upvotes": 155,
    "featured": false,
    "sourceOrder": 7
  },
  {
    "name": "Sourceforge",
    "url": "https://sourceforge.net/",
    "domain": "sourceforge.net",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/sourceforge.webp",
    "dr": 92,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory",
      "tools",
      "ai"
    ],
    "upvotes": 25,
    "featured": false,
    "sourceOrder": 9
  },
  {
    "name": "Hacker News",
    "url": "https://news.ycombinator.com",
    "domain": "news.ycombinator.com",
    "image": "https://media.licdn.com/dms/image/v2/C4D0BAQGPzdBPNxrmEg/company-logo_200_200/company-logo_200_200/0/1673555093250/y_combinator_logo?e=2147483647&v=beta&t=bEYsRYAvhm6-IrR2mylKJKxUYIWxB7Wr4ltHCSIKzOQ",
    "dr": 91,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "community"
    ],
    "upvotes": 22,
    "featured": false,
    "sourceOrder": 10
  },
  {
    "name": "G2",
    "url": "https://www.g2.com/",
    "domain": "g2.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/g2.webp",
    "dr": 91,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 5,
    "featured": false,
    "sourceOrder": 11
  },
  {
    "name": "Product Hunt",
    "url": "https://www.producthunt.com/",
    "domain": "producthunt.com",
    "image": "https://media.licdn.com/dms/image/v2/D4E0BAQEis4DOrmTglw/company-logo_200_200/company-logo_200_200/0/1711562623642/producthunt_logo?e=2147483647&v=beta&t=EkaWOP4DosZE0MEs3l2SrAeUzQeEwjUVTtxTLMqDP-k",
    "dr": 91,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "community",
      "ai",
      "tools"
    ],
    "upvotes": 52,
    "featured": false,
    "sourceOrder": 12
  },
  {
    "name": "Capterra",
    "url": "https://www.capterra.com/",
    "domain": "capterra.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/capterra.webp",
    "dr": 91,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 8,
    "featured": false,
    "sourceOrder": 13
  },
  {
    "name": "StartupFA.me",
    "url": "https://startupfa.me/",
    "domain": "startupfa.me",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/1750711416391-6ezwei8bj5r.jpeg",
    "dr": 83,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "tools",
      "launchpad"
    ],
    "upvotes": 30,
    "featured": false,
    "sourceOrder": 14
  },
  {
    "name": "Fazier",
    "url": "https://fazier.com/",
    "domain": "fazier.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/fazier.jpeg",
    "dr": 82,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "ai"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 15
  },
  {
    "name": "Dang AI",
    "url": "https://dang.ai/",
    "domain": "dang.ai",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/dang.png",
    "dr": 81,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "ai",
      "tools"
    ],
    "upvotes": 12,
    "featured": false,
    "sourceOrder": 16
  },
  {
    "name": "Twelve Tools",
    "url": "https://twelve.tools/",
    "domain": "twelve.tools",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/twelve.jpeg",
    "dr": 81,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 17
  },
  {
    "name": "Indie Hackers",
    "url": "https://indiehackers.com",
    "domain": "indiehackers.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/indiehackers.jpeg",
    "dr": 81,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 16,
    "featured": false,
    "sourceOrder": 18
  },
  {
    "name": "Turbo0",
    "url": "https://turbo0.com/?via=launchdirectories",
    "domain": "turbo0.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/turbo.jpg",
    "dr": 80,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 3,
    "featured": false,
    "sourceOrder": 19
  },
  {
    "name": "findly.tools",
    "url": "https://findly.tools",
    "domain": "findly.tools",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/findly.webp",
    "dr": 80,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "ai",
      "software directory"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 20
  },
  {
    "name": "AlternativeTo",
    "url": "https://alternativeto.net/",
    "domain": "alternativeto.net",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/alternativeto.jpg",
    "dr": 79,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 12,
    "featured": false,
    "sourceOrder": 21
  },
  {
    "name": "SaaSHub",
    "url": "https://www.saashub.com/",
    "domain": "saashub.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/saas.jpeg",
    "dr": 79,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "software directory"
    ],
    "upvotes": 13,
    "featured": false,
    "sourceOrder": 22
  },
  {
    "name": "Toolpilot",
    "url": "https://www.toolpilot.ai/",
    "domain": "toolpilot.ai",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/toolpilot.webp",
    "dr": 78,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 23
  },
  {
    "name": "Peerlist",
    "url": "https://peerlist.io/",
    "domain": "peerlist.io",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/peerlist_logo.jpeg",
    "dr": 77,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "community",
      "launchpad"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 24
  },
  {
    "name": "There's An AI For That",
    "url": "https://theresanaiforthat.com/?via=krzysztof",
    "domain": "theresanaiforthat.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/thereisaiforthat.jpg",
    "dr": 77,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "ai",
      "tools",
      "software directory"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 25
  },
  {
    "name": "BetaList",
    "url": "https://betalist.com/",
    "domain": "betalist.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/betalist.jpeg",
    "dr": 76,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "community"
    ],
    "upvotes": 12,
    "featured": false,
    "sourceOrder": 26
  },
  {
    "name": "Alternative.me",
    "url": "https://alternative.me/",
    "domain": "alternative.me",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/alternative.webp",
    "dr": 75,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "ai",
      "software directory",
      "tools"
    ],
    "upvotes": 7,
    "featured": false,
    "sourceOrder": 27
  },
  {
    "name": "SubmitAiTools",
    "url": "https://submitaitools.org/",
    "domain": "submitaitools.org",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/submitaitools.webp",
    "dr": 75,
    "dofollow": false,
    "pricing": "Paid",
    "tags": [
      "tools",
      "ai"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 28
  },
  {
    "name": "Uneed",
    "url": "https://www.uneed.best?atp=pBmSdT",
    "domain": "uneed.best",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/images.jpeg",
    "dr": 75,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "tools",
      "launchpad"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 29
  },
  {
    "name": "LaunchIgniter",
    "url": "https://launchigniter.com/",
    "domain": "launchigniter.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/launchigniter.jpg",
    "dr": 75,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 8,
    "featured": false,
    "sourceOrder": 30
  },
  {
    "name": "SoftwareWorld",
    "url": "https://www.softwareworld.co/",
    "domain": "softwareworld.co",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/softwareworld.webp",
    "dr": 73,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 31
  },
  {
    "name": "TinyLaunch",
    "url": "https://www.tinylaunch.com/",
    "domain": "tinylaunch.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/tinylaunch.png",
    "dr": 72,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 5,
    "featured": false,
    "sourceOrder": 32
  },
  {
    "name": "neeed.directory",
    "url": "https://neeed.directory/",
    "domain": "neeed.directory",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/need.webp",
    "dr": 72,
    "dofollow": true,
    "pricing": "Unknown",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 33
  },
  {
    "name": "FoundrList",
    "url": "https://foundrlist.com/",
    "domain": "foundrlist.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/foundrlist.webp",
    "dr": 72,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 16,
    "featured": false,
    "sourceOrder": 34
  },
  {
    "name": "Open Launch",
    "url": "https://open-launch.com/",
    "domain": "open-launch.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/OpenLaunch.jpg",
    "dr": 71,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "community",
      "ai",
      "tools"
    ],
    "upvotes": 5,
    "featured": false,
    "sourceOrder": 35
  },
  {
    "name": "startupfa.st",
    "url": "https://www.startupfa.st/",
    "domain": "startupfa.st",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startupfa.webp",
    "dr": 71,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 36
  },
  {
    "name": "SideProjectors",
    "url": "https://www.sideprojectors.com/",
    "domain": "sideprojectors.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/sideprojectors.jpeg",
    "dr": 70,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "community"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 37
  },
  {
    "name": "magicbox.tools",
    "url": "https://magicbox.tools/",
    "domain": "magicbox.tools",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/magicbox.webp",
    "dr": 70,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "ai",
      "software directory"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 38
  },
  {
    "name": "Future Tools",
    "url": "https://www.futuretools.io/",
    "domain": "futuretools.io",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/futuretools.jpg",
    "dr": 69,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "ai"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 39
  },
  {
    "name": "Pitchwall",
    "url": "https://pitchwall.co/",
    "domain": "pitchwall.co",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/pitchwall.webp",
    "dr": 69,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 40
  },
  {
    "name": "Tiny Startups",
    "url": "https://tinystartups.com/",
    "domain": "tinystartups.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/tinystartups.webp",
    "dr": 69,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 5,
    "featured": false,
    "sourceOrder": 41
  },
  {
    "name": "TrustMRR",
    "url": "https://trustmrr.com/",
    "domain": "trustmrr.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/trustmrr.webp",
    "dr": 68,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "software directory"
    ],
    "upvotes": 7,
    "featured": false,
    "sourceOrder": 42
  },
  {
    "name": "AiTools",
    "url": "https://aitools.inc/",
    "domain": "aitools.inc",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/aitools.webp",
    "dr": 68,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "ai",
      "tools",
      "software directory"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 43
  },
  {
    "name": "NextGen Tools",
    "url": "https://www.nxgntools.com",
    "domain": "nxgntools.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/nxgntools.webp",
    "dr": 67,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 9,
    "featured": false,
    "sourceOrder": 44
  },
  {
    "name": "acidtools.com",
    "url": "https://acidtools.com/",
    "domain": "acidtools.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/acid.webp",
    "dr": 66,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 45
  },
  {
    "name": "toolsfine",
    "url": "https://toolsfine.com/",
    "domain": "toolsfine.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/toolsfine.webp",
    "dr": 65,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 3,
    "featured": false,
    "sourceOrder": 47
  },
  {
    "name": "Startup Stash",
    "url": "https://startupstash.com/",
    "domain": "startupstash.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startupstash.jpeg",
    "dr": 64,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "tools"
    ],
    "upvotes": 3,
    "featured": false,
    "sourceOrder": 48
  },
  {
    "name": "DevHunt",
    "url": "https://devhunt.org/",
    "domain": "devhunt.org",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/devhunt.jpeg",
    "dr": 62,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 49
  },
  {
    "name": "Super Launch",
    "url": "https://www.superlaun.ch",
    "domain": "superlaun.ch",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/superlaunch-logo.webp",
    "dr": 61,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 9,
    "featured": false,
    "sourceOrder": 50
  },
  {
    "name": "Launch Llama Tools",
    "url": "https://tools.launchllama.co/",
    "domain": "tools.launchllama.co",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/launchlama.webp",
    "dr": 61,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "ai"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 51
  },
  {
    "name": "MicroLaunch",
    "url": "https://microlaunch.net/",
    "domain": "microlaunch.net",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/microlaunch.png",
    "dr": 60,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 52
  },
  {
    "name": "Indie Deals",
    "url": "https://www.indie.deals/",
    "domain": "indie.deals",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/indie.jpeg",
    "dr": 60,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "deals",
      "tools"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 53
  },
  {
    "name": "Indiehunt",
    "url": "https://indiehunt.io/",
    "domain": "indiehunt.io",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/indiehunt.webp",
    "dr": 59,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "ai"
    ],
    "upvotes": 10,
    "featured": false,
    "sourceOrder": 54
  },
  {
    "name": "aiwith.me",
    "url": "https://aiwith.me/",
    "domain": "aiwith.me",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/aiwithme.webp",
    "dr": 59,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "ai"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 55
  },
  {
    "name": "StartupBase",
    "url": "https://startupbase.io/",
    "domain": "startupbase.io",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startupbase.jpeg",
    "dr": 58,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 56
  },
  {
    "name": "Huzzler",
    "url": "https://huzzler.so/",
    "domain": "huzzler.so",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/1749379731239-zo15cxsbbkq.png",
    "dr": 58,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "community"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 57
  },
  {
    "name": "Unite List",
    "url": "https://unitelist.com/",
    "domain": "unitelist.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/unitelist.webp",
    "dr": 57,
    "dofollow": true,
    "pricing": "Unknown",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 58
  },
  {
    "name": "FridayHunt",
    "url": "https://fridayhunt.com/",
    "domain": "fridayhunt.com",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/fridayhunt.webp",
    "dr": 57,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 59
  },
  {
    "name": "Startups Lab",
    "url": "https://startupslab.site",
    "domain": "startupslab.site",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startupslab.webp",
    "dr": 55,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 60
  },
  {
    "name": "Firsto",
    "url": "https://firsto.co/",
    "domain": "firsto.co",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/firsto.jpeg",
    "dr": 55,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 7,
    "featured": false,
    "sourceOrder": 61
  },
  {
    "name": "Launch",
    "url": "https://trylaunch.ai/",
    "domain": "trylaunch.ai",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/trylaunch.webp",
    "dr": 54,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 8,
    "featured": false,
    "sourceOrder": 62
  },
  {
    "name": "SaasHunt",
    "url": "https://saashunt.best/",
    "domain": "saashunt.best",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/saashunt.webp",
    "dr": 53,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 63
  },
  {
    "name": "Launching Next",
    "url": "https://www.launchingnext.com/",
    "domain": "launchingnext.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/launchingnext.jpg",
    "dr": 52,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 64
  },
  {
    "name": "AI Tech Viral",
    "url": "https://aitechviral.com/",
    "domain": "aitechviral.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/aitechviral.webp",
    "dr": 52,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "ai"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 65
  },
  {
    "name": "Shipybara",
    "url": "https://shipybara.com/",
    "domain": "shipybara.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/shipybara.webp",
    "dr": 52,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "community"
    ],
    "upvotes": 34,
    "featured": false,
    "sourceOrder": 66
  },
  {
    "name": "rankinpublic.xyz",
    "url": "https://rankinpublic.xyz/",
    "domain": "rankinpublic.xyz",
    "image": null,
    "dr": 52,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "community",
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 67
  },
  {
    "name": "AppaList",
    "url": "https://appalist.com/",
    "domain": "appalist.com",
    "image": null,
    "dr": 51,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 68
  },
  {
    "name": "Open Alternative",
    "url": "https://openalternative.co/",
    "domain": "openalternative.co",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/openalternative.jpeg",
    "dr": 51,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "software directory"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 69
  },
  {
    "name": "We Like Tools",
    "url": "https://weliketools.com/",
    "domain": "weliketools.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/weliketools.webp",
    "dr": 50,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 70
  },
  {
    "name": "StartupTrusted",
    "url": "https://startuptrusted.com/",
    "domain": "startuptrusted.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startuptrusted.webp",
    "dr": 49,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 71
  },
  {
    "name": "IdeaKiln",
    "url": "https://ideakiln.com",
    "domain": "ideakiln.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/ideakiln.jpg",
    "dr": 48,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad",
      "ai"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 72
  },
  {
    "name": "Promote Project",
    "url": "https://www.promoteproject.com/",
    "domain": "promoteproject.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/promoteproject.jpeg",
    "dr": 48,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 73
  },
  {
    "name": "Micro SaaS Examples",
    "url": "https://www.microsaasexamples.com/",
    "domain": "microsaasexamples.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/mse.jpg",
    "dr": 47,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 74
  },
  {
    "name": "SaaSBison",
    "url": "https://saasbison.com/",
    "domain": "saasbison.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/saasbison%20logo-01.webp",
    "dr": 45,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 3,
    "featured": false,
    "sourceOrder": 76
  },
  {
    "name": "AiTools",
    "url": "https://aitools.fyi/",
    "domain": "aitools.fyi",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/aitools.jpeg",
    "dr": 44,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "ai",
      "tools",
      "software directory"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 77
  },
  {
    "name": "Proofstories",
    "url": "https://proofstories.io/directory",
    "domain": "proofstories.io",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/proofstories.webp",
    "dr": 43,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "community",
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 78
  },
  {
    "name": "Daily Pings",
    "url": "https://dailypings.com/",
    "domain": "dailypings.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/dailypings.webp",
    "dr": 43,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "community",
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 79
  },
  {
    "name": "TinyLaunchpad",
    "url": "https://tinylaunchpad.com/",
    "domain": "tinylaunchpad.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/tinylaunchpad.webp",
    "dr": 43,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 80
  },
  {
    "name": "Startups.fm",
    "url": "https://startups.fm/",
    "domain": "startups.fm",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/Startupsfm.jpg",
    "dr": 42,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "community"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 81
  },
  {
    "name": "Awesome Tools",
    "url": "https://awesome.tools/",
    "domain": "awesome.tools",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/awesome-tools.webp",
    "dr": 42,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 82
  },
  {
    "name": "startuplist.ing",
    "url": "https://startuplist.ing/",
    "domain": "startuplist.ing",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startuplist.webp",
    "dr": 41,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 7,
    "featured": false,
    "sourceOrder": 83
  },
  {
    "name": "FindYourSaaS",
    "url": "https://www.findyoursaas.com/",
    "domain": "findyoursaas.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/findyoursaas.jpeg",
    "dr": 41,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 84
  },
  {
    "name": "ProductBurst",
    "url": "https://productburst.com/",
    "domain": "productburst.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/PB.jpg",
    "dr": 40,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 85
  },
  {
    "name": "toolfolio",
    "url": "https://toolfolio.io/",
    "domain": "toolfolio.io",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/toolfolio.webp",
    "dr": 39,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 86
  },
  {
    "name": "Saaspa.ge",
    "url": "https://www.saaspa.ge/",
    "domain": "saaspa.ge",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/saaspage.webp",
    "dr": 39,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 88
  },
  {
    "name": "IndieHub",
    "url": "https://indiehub.best/",
    "domain": "indiehub.best",
    "image": null,
    "dr": 39,
    "dofollow": false,
    "pricing": "Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 89
  },
  {
    "name": "DodoDirectory",
    "url": "https://dododirectory.com/",
    "domain": "dododirectory.com",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/screenshots/dododirectory.webp",
    "dr": 38,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "ai",
      "tools",
      "software directory"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 90
  },
  {
    "name": "1000.tools",
    "url": "https://1000.tools/",
    "domain": "1000.tools",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/1000.jpeg",
    "dr": 38,
    "dofollow": false,
    "pricing": "Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 91
  },
  {
    "name": "BuildVoyage",
    "url": "https://buildvoyage.com/",
    "domain": "buildvoyage.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/BuildVoyage.webp",
    "dr": 38,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 92
  },
  {
    "name": "Sumodir",
    "url": "https://sumodir.com/",
    "domain": "sumodir.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/sumodir.webp",
    "dr": 36,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 95
  },
  {
    "name": "ConfettiSaaS",
    "url": "https://confettisaas.com",
    "domain": "confettisaas.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/confetti.webp",
    "dr": 36,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "community"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 96
  },
  {
    "name": "Made with Lovable",
    "url": "https://madewithlovable.com/",
    "domain": "madewithlovable.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/madewithlovable.jpeg",
    "dr": 33,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 8,
    "featured": false,
    "sourceOrder": 100
  },
  {
    "name": "ShipYard HQ",
    "url": "https://shipyardhq.dev",
    "domain": "shipyardhq.dev",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/shipyard.webp",
    "dr": 33,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 101
  },
  {
    "name": "LLM Relevance",
    "url": "https://llmrelevance.com/",
    "domain": "llmrelevance.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/LLM.webp",
    "dr": 31,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "ai"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 103
  },
  {
    "name": "Resource.fyi",
    "url": "https://resource.fyi/",
    "domain": "resource.fyi",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/resource.webp",
    "dr": 31,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 104
  },
  {
    "name": "Stellar Launch",
    "url": "https://stellarlaunch.org/",
    "domain": "stellarlaunch.org",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/stellar.webp",
    "dr": 30,
    "dofollow": false,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 106
  },
  {
    "name": "Startups.fyi",
    "url": "https://startups.fyi/",
    "domain": "startups.fyi",
    "image": null,
    "dr": 30,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 107
  },
  {
    "name": "IndieHackerStacks",
    "url": "https://indiehackerstacks.com/",
    "domain": "indiehackerstacks.com",
    "image": null,
    "dr": 30,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "community"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 108
  },
  {
    "name": "HUNT0",
    "url": "https://hunt0.com",
    "domain": "hunt0.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/hunt0.webp",
    "dr": 29,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 109
  },
  {
    "name": "ToolHub",
    "url": "https://toolhub.me/",
    "domain": "toolhub.me",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/toolhub.webp",
    "dr": 26,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "tools",
      "software directory"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 112
  },
  {
    "name": "SaaSGrow",
    "url": "https://saasgrow.app/",
    "domain": "saasgrow.app",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/saasgrow.webp",
    "dr": 26,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 113
  },
  {
    "name": "EuroAlternative",
    "url": "https://euroalternative.co",
    "domain": "euroalternative.co",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/euroalternative.png",
    "dr": 26,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "tools"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 114
  },
  {
    "name": "startuups",
    "url": "https://startuups.com/",
    "domain": "startuups.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/startuups.webp",
    "dr": 26,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "launchpad",
      "tools"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 115
  },
  {
    "name": "Toollist",
    "url": "https://toollist.ai/",
    "domain": "toollist.ai",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/toollist.webp",
    "dr": 25,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "ai"
    ],
    "upvotes": 1,
    "featured": false,
    "sourceOrder": 116
  },
  {
    "name": "ProductLaunchpad",
    "url": "https://productlaunchpad.app/",
    "domain": "productlaunchpad.app",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/productlaunchpad-logo.webp",
    "dr": 23,
    "dofollow": true,
    "pricing": "Free",
    "tags": [
      "launchpad"
    ],
    "upvotes": 2,
    "featured": false,
    "sourceOrder": 117
  },
  {
    "name": "Saassy Board",
    "url": "https://saassy-board.com/",
    "domain": "saassy-board.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/saasboard.webp",
    "dr": 21,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "community"
    ],
    "upvotes": 4,
    "featured": false,
    "sourceOrder": 118
  },
  {
    "name": "madewithbolt",
    "url": "https://madewithbolt.com/",
    "domain": "madewithbolt.com",
    "image": "https://etbuxykkwfrwzcvvlrai.supabase.co/storage/v1/object/public/images/directories/madewithbolt.webp",
    "dr": 20,
    "dofollow": false,
    "pricing": "Free",
    "tags": [
      "software directory"
    ],
    "upvotes": 3,
    "featured": false,
    "sourceOrder": 120
  },
  {
    "name": "Postioo",
    "url": "https://postioo.com",
    "domain": "postioo.com",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/postioo.webp",
    "dr": 7,
    "dofollow": true,
    "pricing": "Paid",
    "tags": [
      "software directory"
    ],
    "upvotes": 0,
    "featured": false,
    "sourceOrder": 122
  },
  {
    "name": "Launchy.tools",
    "url": "https://launchy.tools/",
    "domain": "launchy.tools",
    "image": "https://pub-21fa1723f92e41a09cafb19ba7ae8ab1.r2.dev/launchy.webp",
    "dr": 7,
    "dofollow": true,
    "pricing": "Free + Paid",
    "tags": [
      "tools"
    ],
    "upvotes": 6,
    "featured": false,
    "sourceOrder": 123
  }
];

