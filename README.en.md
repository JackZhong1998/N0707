<p align="center">
  <strong>NowBuild SaaS Kit</strong><br/>
  Production-ready SaaS framework · Auth · Payments · Database · Analytics · SEO · i18n
</p>

<p align="center">
  <a href="https://NowBuild.ai/open-source-saas-starter">🌐 Project page</a> · English | <a href="./README.md">中文</a>
</p>

---

## What is this?

**NowBuild SaaS Kit** is a full-stack starter framework for building SaaS products fast.

If you need a website with user authentication, subscription payments, a landing page, and a blog, this framework gives you all of that out of the box — so you can focus on what makes your product unique.

| What you need | What we use | Your time |
|--------------|-------------|-----------|
| User login / signup | Clerk | Built-in, 0 hours |
| Online payments (subscriptions) | Stripe | Built-in, 0 hours |
| Analytics | Google Analytics | Built-in, 0 hours |
| Database | Supabase | Built-in, 0 hours |
| Multi-language (EN / ZH) | next-intl | Built-in, 0 hours |
| SEO optimization | Structured data + meta tags | Built-in, 0 hours |
| Deploy to production | Vercel one-click deploy | 5 minutes |

> Building all this from scratch typically takes 2–4 weeks. With NowBuild, you can ship in one day.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 | Full-stack React framework with SSR |
| Language | TypeScript | Type safety, fewer bugs |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Auth | Clerk | User login, signup, social auth |
| Payments | Stripe | Global payment platform |
| Database | Supabase | PostgreSQL cloud database |
| i18n | next-intl | Internationalization framework |
| Analytics | Google Analytics | User behavior tracking & traffic stats |
| Deploy | Vercel | Officially recommended for Next.js |

---

## Pages Included

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | Hero + Feature Comparison + Highlights + FAQ + Footer |
| Blog | `/blog` | Post listing + individual post pages |
| Pricing | `/pricing` | Monthly/yearly toggle, 3-tier plans |
| Privacy Policy | `/privacy` | Full privacy policy template (EN & ZH) |
| Terms of Service | `/terms` | Full terms template (EN & ZH) |
| About | `/about` | Team story + values |
| Auth | `/sign-in` `/sign-up` | Clerk authentication pages |

---

## Quick Start (3 Steps)

> Prerequisites: [Node.js](https://nodejs.org/) 18+ installed on your machine.
> Not sure? Open a terminal and run `node -v` to check.

### Step 1: Clone & Install

```bash
git clone https://github.com/your-username/nowbuild-saas-kit.git
cd nowbuild-saas-kit
npm install
```

### Step 2: Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` in any editor and replace the `xxxxx` placeholders with your real keys.

> Don't know where to get them? See the **Detailed Setup Guide** below.

### Step 3: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 AI Agent Onboarding (Cursor / Claude Code / Codex)

If you want AI to handle onboarding and troubleshooting quickly, use the built-in skill files:

- Chinese skill: `skills/nowbuild-onboarding/SKILL.md`
- English skill: `skills/nowbuild-onboarding/SKILL.en.md`

Suggested trigger prompts:

- "Help me run this SaaS framework in Cursor."
- "Set up this project in Claude Code and configure env."
- "What is the fastest way to boot this framework in Codex?"

This skill guides users through the shortest path: install dependencies, copy and fill `.env.local`, start the dev server, verify key routes (`/`, `/sign-in`, `/pricing`), and troubleshoot common startup/integration errors.

---

## 🔑 Environment Variable Setup Guide (Start Here)

> This is the most important section of this document. Follow each step carefully.

You need accounts on 3 platforms:

| Platform | Purpose | Sign Up |
|----------|---------|---------|
| Clerk | User authentication | https://clerk.com |
| Stripe | Online payments | https://stripe.com |
| Supabase | Database storage | https://supabase.com |
| Google Analytics | User behavior analytics | https://analytics.google.com |

---

### 📌 Step 1: Set Up Clerk (Authentication)

> Clerk handles user login and signup. You need **2 keys**.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public key (safe for frontend) |
| `CLERK_SECRET_KEY` | Secret key (server-side only) |

**How to get them:**

1. Go to https://clerk.com → click **"Sign Up"**
2. After logging in, click **"+ Create application"**
3. Enter an app name (e.g., `NowBuild`), choose sign-in methods (Email + Google recommended)
4. Click **"Create application"**
5. You'll see both keys displayed on the next screen — copy them to your `.env.local`

> 💡 **Can't find the keys?** Go to **API Keys** in the left sidebar of your Clerk Dashboard.

> ⚠️ **Security**: Never expose `CLERK_SECRET_KEY` publicly. The `.env.local` file is already in `.gitignore`.

---

### 📌 Step 2: Set Up Stripe (Payments)

> Stripe handles subscription payments. This is the most detailed section — you need **5 values**.

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public key | API Keys page |
| `STRIPE_SECRET_KEY` | Secret key | API Keys page |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Webhooks page |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | Monthly price ID | Products page |
| `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` | Yearly price ID | Products page |

#### 2.1 Create a Stripe Account

- Go to https://stripe.com → click **"Start now"**
- Complete the registration

> 💡 **Test mode vs Live mode**: Stripe has two modes. **Test mode** uses fake money for development (keys start with `pk_test_` / `sk_test_`). **Live mode** processes real payments. Always develop in Test mode first.

#### 2.2 Get API Keys

**Path: Dashboard → "Developers" (top-right) → "API Keys"**

1. Make sure **"Test mode"** is enabled (toggle at the top of the page)
2. Click **"Developers"** in the top-right corner
3. Click **"API Keys"** in the left sidebar
4. Copy:
   - **Publishable key** (starts with `pk_test_`) → paste into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Click **"Reveal test key"** → copy **Secret key** (starts with `sk_test_`) → paste into `STRIPE_SECRET_KEY`

#### 2.3 Create Products & Prices

**Path: Dashboard → "Products" (left sidebar) → "+ Add product"**

1. Click **"Products"** in the left menu → **"+ Add product"**
2. Fill in:
   - **Name**: `NowBuild Pro`
   - **Description**: `Professional plan with unlimited features` (optional)
3. Under **"Pricing"**:
   - Set **Model** to **"Recurring"**
   - Enter monthly price (e.g., `29.00 USD`), billing period = **Monthly**
   - Click **"Add another price"**
   - Enter yearly price (e.g., `278.00 USD`), billing period = **Yearly**
4. Click **"Save product"**
5. On the product detail page, find the two Price IDs (format: `price_1Abc...`):
   - Monthly Price ID → `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
   - Yearly Price ID → `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID`

#### 2.4 Set Up Webhooks (Important!)

> **What is a Webhook?** After a user completes payment, Stripe sends an HTTP request to your server to notify it. Without this, your app won't know a payment was made.

**For production — Path: Dashboard → "Developers" → "Webhooks"**

1. Click **"Developers"** → **"Webhooks"** → **"+ Add endpoint"**
2. Enter your **Endpoint URL**:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
3. Click **"+ Select events"** and check these 3 events:

| Event | What it means |
|-------|---------------|
| `checkout.session.completed` | User completed a payment |
| `customer.subscription.updated` | Subscription status changed |
| `customer.subscription.deleted` | Subscription was canceled |

4. Click **"Add endpoint"**
5. On the endpoint detail page, click **"Reveal"** next to **"Signing secret"**
6. Copy the `whsec_...` value → paste into `STRIPE_WEBHOOK_SECRET`

**For local development — Use Stripe CLI:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# or: scoop install stripe               # Windows

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a temporary webhook secret — copy it to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

#### 2.5 Stripe Checklist

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — starts with `pk_test_`
- [ ] `STRIPE_SECRET_KEY` — starts with `sk_test_`
- [ ] `STRIPE_WEBHOOK_SECRET` — starts with `whsec_`
- [ ] `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` — starts with `price_`
- [ ] `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` — starts with `price_`

---

### 📌 Step 3: Set Up Supabase (Database)

> Supabase provides a PostgreSQL database. You need **3 values**.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) |

**How to get them:**

1. Go to https://supabase.com → sign up (GitHub login recommended)
2. Click **"New Project"** → enter a name and database password → choose a region → click **"Create new project"**
3. Wait ~1-2 minutes for the project to be ready
4. Go to **Settings** (gear icon) → **API**:
   - **Project URL** → copy to `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → copy to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key (click the eye icon to reveal) → copy to `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Security**: The `service_role` key bypasses Row Level Security. Never use it in frontend code.

**Initialize the database:**

1. In Supabase Dashboard, click **"SQL Editor"** in the left menu
2. Click **"+ New query"**
3. Copy the contents of `supabase/schema.sql` from this project and paste it in
4. Click **"Run"** — you should see `Success. No rows returned`

---

### 📌 Step 4: Set Up Google Analytics

> Google Analytics (GA) is a free tool from Google that lets you understand how users interact with your website — page views, traffic sources, session duration, and more. You need **1 value**.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID (format: `G-XXXXXXXXXX`) |

**How to get it:**

1. Go to https://analytics.google.com and sign in with your Google account
2. Click **"Start measuring"** (if first time) or **"Admin"** (gear icon, bottom-left)
3. Create an account → enter account name (e.g., `NowBuild`) → click **"Next"**
4. Create a property → enter name (e.g., `NowBuild Website`) → set timezone and currency → click **"Next"**
5. Fill in business info → click **"Create"**
6. Choose platform: click **"Web"**
7. Enter your website URL (e.g., `nowbuild.ai`) and stream name → click **"Create stream"**
8. On the stream detail page, copy the **Measurement ID** (looks like `G-A1B2C3D4E5`)
9. Paste it into `NEXT_PUBLIC_GA_MEASUREMENT_ID` in your `.env.local`

> 💡 **Can't find the ID?** Go to **Admin** (gear icon) → **Data Streams** → click your stream → the Measurement ID is at the top.

> 💡 **Don't want analytics?** Totally fine — skip this step. If `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays as the default `G-XXXXXXXXXX`, the GA script won't load. No impact on your site.

---

### 📌 Step 5: App Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your website URL | `http://localhost:3000` for dev, your real domain for production |
| `NEXT_PUBLIC_APP_NAME` | App display name | `NowBuild` |

---

## Project Structure

```
├── middleware.ts                  # Clerk + next-intl middleware
├── next.config.mjs                # Next.js configuration
├── next-sitemap.config.js         # Sitemap generation config
├── supabase/schema.sql            # Database schema
├── public/robots.txt              # Search engine directives
└── src/
    ├── app/
    │   ├── layout.tsx             # Root layout
    │   ├── globals.css            # Global styles + Tailwind theme
    │   ├── [locale]/              # ← Locale-based routing
    │   │   ├── layout.tsx         # Locale layout (fonts, providers)
    │   │   ├── page.tsx           # Landing page
    │   │   ├── about/             # About page
    │   │   ├── blog/              # Blog (listing + posts)
    │   │   ├── pricing/           # Pricing page
    │   │   ├── privacy/           # Privacy policy
    │   │   ├── terms/             # Terms of service
    │   │   ├── sign-in/           # Sign in (Clerk)
    │   │   └── sign-up/           # Sign up (Clerk)
    │   └── api/                   # API routes (Stripe)
    ├── components/                # UI components
    ├── i18n/                      # Internationalization config
    ├── lib/                       # Stripe & Supabase clients
    └── messages/                  # Translation files (en.json, zh.json)
```

---

## i18n (Multi-Language)

Built-in support for English and Chinese. All page content is managed through JSON translation files.

**Adding a new language in 4 steps:**

1. Add the locale code to `src/i18n/routing.ts` (`locales` array)
2. Create a translation file: `src/messages/{locale}.json`
3. Add the locale label in `src/components/LanguageSwitcher.tsx`
4. Add `alternateRefs` in `next-sitemap.config.js`

---

## SEO Optimization

**Technical SEO:**
- Server-side rendering for full crawlability
- Auto-generated XML Sitemap with hreflang
- robots.txt, canonical URLs, security headers
- Font preloading, DNS Prefetch, AVIF/WebP images

**Content SEO:**
- Per-page title, description, Open Graph, Twitter Cards
- JSON-LD structured data: Organization, WebSite, FAQPage, BlogPosting, BreadcrumbList
- Semantic HTML with proper heading hierarchy

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com), log in with GitHub
3. Click **"Import Project"** and select your repository
4. Add all environment variables from `.env.local`
5. Click **"Deploy"**

> Remember to update `NEXT_PUBLIC_APP_URL` to your production domain and add a production Stripe Webhook endpoint.

---

## Pre-Launch Checklist

- [ ] All environment variables configured with real values
- [ ] Stripe switched from Test mode to Live mode
- [ ] Stripe Webhook configured with production domain
- [ ] Supabase database tables created
- [ ] `NEXT_PUBLIC_APP_URL` updated to production domain
- [ ] Company info updated in privacy policy and terms of service
- [ ] Brand names and contact info updated in translation files

---

## FAQ

**Q: Can I run the project without Clerk/Stripe keys?**
A: Yes. The project gracefully degrades — auth and payment features are automatically skipped, but you can still see the full UI.

**Q: Can I use a different payment provider?**
A: Yes. The payment layer is modular. Replace the Stripe SDK in `src/lib/stripe.ts` and the API routes.

**Q: Can I deploy to platforms other than Vercel?**
A: Yes. This is a standard Next.js app. It works on AWS, Netlify, Docker, or any Node.js-compatible platform.

---

---

<p align="center">
  Built by <a href="https://NowBuild.ai"><strong>NowBuild.ai</strong></a> · Ship your SaaS faster
</p>

## License

MIT — Free to use, modify, and commercialize.
