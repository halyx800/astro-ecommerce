# Project Notes — Orchid Insanity: WooCommerce → Astro Migration

**Purpose of this file:** a working brief so any Claude instance (or the site owner)
picking up this project has full context without re-deriving it. Keep this updated
as decisions are made or reversed. If something here is stale, trust the code and
git history over this doc, and update the doc to match.

---

## 1. The person and their goals

- Runs **orchidinsanity.com**, currently on WordPress + WooCommerce.
- Migrating to **Astro** (static-first) with **Stripe** as payment processor.
- **Why leaving WooCommerce:** had a serious incident where the site degraded
  (slow, broken) and the underlying problem was hard to diagnose/fix without
  significant time/money — lost sales as a result. This is the central motivation:
  they explicitly want a **flat-file, git-based, low-complexity architecture**
  where they can inspect exactly what changed if something breaks, rather than
  debugging an opaque database + plugin stack.
- **Comfort level:** new to Astro specifically, but comfortable in code generally.
  Uses **vim** (not an editor plugin ecosystem), is fluent with **git** conceptually
  and wants a real git workflow (diffs/patches to review and apply themselves).
- **Explicit working style — important:** wants to inspect and approve changes
  incrementally, NOT have a full site generated for them. Treat every change as
  something to explain and let them apply themselves (or review before it lands),
  not something to push directly into their repo autonomously. No unnecessary
  dependencies/bloat — they will care if the codebase accumulates cruft.
- Runs a **second Claude instance on a Debian VM (Google Cloud)** as well as
  this Mac-based instance, so they can work on this project while away from
  their desktop. The two instances don't share memory — this file (plus the
  repo's git history) is the shared source of truth between them.

---

## 2. Business/content requirements

Site sells **live orchid plants** (many genera) plus related non-live goods.
Desired site sections:

1. **Live plants** — subdivided by genus, and within genus by species vs.
   hybrid. Includes both:
   - **common clones** (mass-propagated, stock is *approximate*, doesn't need
     precise tracking)
   - **rare divisions / one-off specimens** (unique, need *precise* stock —
     effectively binary: available or not). Owner said this precision need is
     "a ways off" / not an immediate priority, but the schema should support it.
2. **Non-live products** — growing media, hormones, fertilizer, books.
3. **Articles/blog** — owner-written content on orchid growing, culture,
   history. Prefers **Markdown** over any CMS editor (matches their vim
   workflow). Existing WooCommerce site has categories "Growing Info" /
   "Orchid Science" for this.
4. **Social media** — links out to Instagram/TikTok/Facebook. Leaning toward a
   **static/manual approach** (owner-curated links or a simple JSON of posts)
   over live embed widgets, to avoid extra third-party JS — but not finalized.
5. **Shopping cart + checkout** via Stripe.

**Tagging requirement:** owner wants cross-cutting clickable tags independent
of the genus hierarchy — e.g. "has canes," "deciduous," "fragrant blooms,"
"mottled leaves," "miniature," "easy-to-grow." Confirmed by looking at their
live site: WooCommerce already has a "Miniature Orchids" category that's
really a cross-cutting trait, not a genus — reinforces that tags should be a
separate system from the genus/species taxonomy, not forced into it.

**Reference site inspected:** https://www.orchidinsanity.com — has
genus-based categories under a parent "Orchids" category (Cattleya,
Dendrobium, Oncidium, Paphiopedilum, etc.), a "Species" bucket, a "Supplies"
branch with subcategories, and variant/range pricing (e.g. "$17.99 – $134.99"
for different pot sizes/ages under one listing).

**Scale:** ~500 products total. Confirmed comfortably within flat-file/static
build territory — no database needed, no performance concern at this scale.

---

## 3. Key architectural decisions made so far

- **Content collections, not a database.** Astro's Content Layer API
  (Astro 5.x) — each product/article is a Markdown file with structured
  frontmatter (validated via Zod schema) plus a free-text body. Editing =
  editing a file in vim, no admin UI, no DB to corrupt or slow down.
- **Two-tier inventory model:**
  - Common/clone stock uses a **status enum** (`in-stock` / `low-stock` /
    `sold-out` / `pre-order`) rather than an exact count — matches the
    owner's "approximate is fine" statement for clones.
  - Divisions/one-offs use the same enum plus an optional exact
    `quantityAvailable` (typically `1`) — precise because each is unique.
  - This is one schema serving both cases, differing only in how precisely
    it's used per listing.
- **Variants array** per listing (e.g. different pot sizes/ages, each with
  own price and stock status) — matches how WooCommerce price ranges work
  today.
- **Tags as a separate array field**, generating their own filter/index pages
  independent of the genus/species hierarchy.
- **Stripe Checkout (hosted), not Stripe Elements**, recommended as the
  starting point — far less code/PCI surface than building custom checkout
  UI. Not yet built.
- **Rebuild-on-change inventory, not live stock checks.** Since precision
  isn't critical for most of the catalog, stock updates happen by editing a
  file and redeploying (git push → CI rebuild), not a live database/API call.
  Acceptable small risk of overselling exact-count one-offs was discussed and
  accepted as low-stakes given rarity of that scenario.
- **Open / not yet decided:**
  - Guest checkout only vs. customer accounts + order history — was raised,
    not yet answered. Lean toward guest-only for simplicity unless told
    otherwise.
  - Final social media integration approach (static links vs. embeds vs.
    manual curated grid).
  - **Deployment target — decided 2026-08-04: Cloudflare Pages + Workers.**
    Compared against Vercel/Netlify specifically on the owner's three
    concerns: (1) bot traffic silently running up a large bill — Cloudflare
    Pages' free tier includes unlimited static bandwidth (Vercel/Netlify
    meter bandwidth even on paid tiers, and Vercel specifically has a
    public track record of bill-shock incidents from bot/scraper traffic),
    plus Cloudflare's core business is bot/rate-limit protection at the
    edge, sitting in front of the site by default; (2) speed/stability —
    genuinely comparable across all three at this site's scale, not a
    real differentiator; (3) room to add more technical capability later —
    Cloudflare's Workers platform includes D1 (real serverless SQLite) and
    KV storage, giving the most direct path to build the still-deferred
    inventory-reservation or review-submission features without adding a
    third-party service. Not yet done: actually creating the Cloudflare
    account/project and connecting the GitHub repo (an external step the
    owner does, not a code change); adding the `@astrojs/cloudflare`
    adapter to `astro.config.mjs` is deliberately not done yet either,
    since there's no dynamic endpoint (e.g. a checkout session function)
    to actually run on it — adding the adapter before there's real server
    code to deploy would be pure speculative setup. Do this when the first
    real dynamic endpoint (checkout, or whatever comes first) is actually
    being built.
    This also directly resolves part of the inventory-concurrency question
    below: if a reservation layer is built, Cloudflare's D1/KV is the
    natural atomic store, decided alongside the host itself rather than as
    a separate later choice.

    **First real deployment — 2026-08-05.** Owner created the Cloudflare
    account and connected the GitHub repo via Workers & Pages. One real
    surprise: Cloudflare's dashboard-connected deploy flow turned out to
    use their newer unified Workers model (deploy command `npx wrangler
    deploy`, driven by a `wrangler.jsonc` config file naming the static
    assets directory), not the classic separate "Pages" product with
    dashboard-set build command/output directory fields — confirmed via
    Cloudflare's own current docs rather than guessed, since this project
    had assumed the older Pages model. Added `wrangler.jsonc` at the repo
    root:
    ```jsonc
    {
      "name": "astro-ecommerce",
      "compatibility_date": "2026-08-05",
      "assets": { "directory": "./dist" }
    }
    ```
    Important: this is *not* the `@astrojs/cloudflare` SSR adapter
    discussed above — it's a much lighter, purely declarative file that
    only tells Wrangler where the already-built static files live. It
    doesn't change how Astro builds or add any server-rendering
    capability, so adding it didn't violate the "wait for real dynamic
    code" principle above — it's baseline deployment plumbing needed for
    *any* deploy through Cloudflare's current model, static or not.
    Confirmed working: build succeeded on Cloudflare's infrastructure
    (28 pages, matching local builds exactly) and deployed live to
    `https://astro-ecommerce.deanyhung.workers.dev` — a public test URL,
    **not** the real domain, which is untouched and still pointing at
    the WooCommerce site. Domain cutover is a separate, deliberate step
    for later.
    One cosmetic note for later: build logs show ~450+ Sass deprecation
    warnings from the vendored Bootstrap SCSS (old `@import` syntax,
    `darken()`/`lighten()`, etc. — all slated for removal in a future
    Dart Sass major version). Pre-existing in the theme, not caused by
    this deploy, harmless for now — worth a cleanup pass eventually, not
    urgent.

    **`base` path finally removed, and the bug that removal exposed —
    2026-08-05, same day.** The owner visited the live test URL and
    reported it looked completely unstyled with no interactivity — raw
    text and links only. Diagnosed via direct `curl` against the live
    deployment (not guessed): every CSS/JS/link path in the built HTML
    was prefixed `/astro-ecommerce/...`, a path that returned 404 on the
    real deployment, since Cloudflare serves the site at the domain
    root. This was the long-flagged `base: '/astro-ecommerce'` leftover
    from the original Creative Tim GitHub Pages template, finally
    causing real, visible breakage rather than just being a known future
    cleanup item. Removed from `astro.config.mjs`, plus two follow-on
    fixes it exposed:
    - `public/robots.txt`'s hardcoded sitemap URL and one hardcoded
      internal link in `src/content/faqs/faq.md` both had the
      `/astro-ecommerce` prefix baked in as literal text (not derived
      from config) — fixed directly. The XML sitemap itself needed no
      manual fix, since `@astrojs/sitemap` derives its URLs from
      `site`/`base` automatically.
    - **A second, sitewide bug the removal exposed:** `navbar.tsx` and
      `footer.tsx` had `/astro-ecommerce/...` hardcoded directly as
      literal strings, not using `import.meta.env.BASE_URL` like the
      rest of the codebase — invisible before now because the hardcoded
      value happened to match the configured `base`. Beyond that, fixing
      those two files surfaced a deeper, sitewide issue: the codebase's
      standard pattern, `` `${import.meta.env.BASE_URL}/path` ``, quietly
      depended on `BASE_URL` never itself ending in a slash — true for
      the old `/astro-ecommerce` value, false for Astro's actual default
      of `/` once `base` is unset. Every occurrence of that pattern was
      producing a doubled leading slash (`//shop/`, `//images/...`) —
      not cosmetic: a URL starting with `//` is protocol-relative,
      meaning a browser reads what follows as a *hostname*, so
      `href="//shop/"` would try to navigate to a nonexistent site
      called "shop", not this site's `/shop/` page.
      Found and fixed **61 occurrences across 24 files** — first a
      scoped sitewide find/replace for the literal-slash case
      (`` BASE_URL}/path `` → `` BASE_URL}path ``, safe since 100%
      uniform), then a second, separate pass for the interpolation-to-
      interpolation case (`` `${BASE_URL}${src}` `` where `src` is an
      image/cover-image path that itself already starts with `/`, e.g.
      `data.images`, `data.coverImage`, `thumb_src` — fixed by stripping
      the value's own leading slash at each of the ~9 real call sites
      before concatenating, since `item.kind`-based uses of the same
      interpolation pattern, e.g. `` `${BASE_URL}${item.kind}/...` ``,
      were already correct and didn't need touching — `item.kind` is a
      bare collection name like `"plants"`, no leading slash).
      Verified via a full scan of real build output (not just source
      code) for any remaining `//` in an `href`/`src`, and a sitewide
      grep for any leftover `astro-ecommerce` string anywhere in
      `dist/` — both came back clean. Pushed; Cloudflare's Git-connected
      deploy should pick it up automatically on the next build.
  - Whether the top-level `stockStatus` field (in addition to per-variant
    stockStatus) is worth the duplication — flagged to the owner as a design
    choice they may want simplified.
  - **Inventory concurrency / reservation (raised 2026-07-30):** the
    "rebuild-on-change" model (stock edits = edit file + git push + CI
    rebuild) only covers slow, occasional stock changes. It can't arbitrate
    a flash sale — e.g. a fixed qty of 10 emailed to the customer list,
    expected to sell out over ~24 hours with many buyers hitting checkout
    concurrently. Nothing today connects a variant's `quantityAvailable` to
    any payment provider; whatever creates the checkout session needs to
    atomically check-and-decrement a *live* counter at the moment of
    purchase, not read a value baked in at the last rebuild. Two directions
    discussed:
    - Provider-native limits (e.g. Stripe Payment Links' "limit the number
      of payments") — simplest, but ties inventory enforcement to one
      provider's feature set.
    - A self-maintained reservation layer (reserve → redirect to whichever
      payment provider → confirm via webhook, or release on
      timeout/failure) — provider-agnostic, so switching between
      Stripe/Square/PayPal later wouldn't touch inventory logic. **Owner is
      explicitly not committed to Stripe** as the final payment provider,
      so this is the leaning direction.

    Whether the reservation counter can just be "a file on the server"
    depends on the eventual hosting choice: fine on a persistent always-on
    process (atomic in-process writes, or something like SQLite with real
    transactions), but NOT safe as a plain flat file under serverless
    functions (Vercel/Netlify/Cloudflare Functions are stateless and
    horizontally scaled — concurrent invocations don't share a local
    filesystem, so naive concurrent file reads/writes will race and
    oversell). If serverless hosting is chosen, this needs a small external
    atomic store (hosted KV/Redis/tiny DB) instead of a literal file. Not
    yet decided — ties directly into the still-open deployment target
    decision above.

- **Order management system — scoped 2026-08-05, not built.** Blocked on
  the Cloudflare account actually being created; revisit once that
  exists. Grew out of reopening the guest-checkout-vs-accounts question
  (still leaning guest-only — see above) with a lighter goal: customers
  can look up their own order without a real account, and the owner has
  a way to manage orders and get them onto his own machine without
  giving staff access to the Cloudflare account. Five pieces:

  1. **D1 `orders` table** — the single source of truth. Sketch:
     ```sql
     CREATE TABLE orders (
       id TEXT PRIMARY KEY,
       email TEXT NOT NULL,
       items TEXT NOT NULL,        -- JSON: what was purchased
       total REAL NOT NULL,
       status TEXT NOT NULL DEFAULT 'paid',  -- paid, processing, shipped, delivered, refunded
       tracking_number TEXT,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     );
     ```
  2. **Order creation — a Worker, triggered by a Square webhook.** Square
     notifies this Worker when a payment completes; its only job is
     writing one row into D1. Kept deliberately narrow (no file
     handling, no email, nothing else in this path) so the
     concurrency-sensitive part stays simple and safe under D1's real
     transactions. Refunds arrive the same way (another Square webhook),
     updating `status` automatically — payment-status changes are the
     one part of "updated order status" that requires no manual work.
  3. **Customer self-service lookup — email + magic link, not instant
     results.** Customer enters their email; if D1 has orders under it,
     a random short-lived token goes into KV (KV's native auto-expiry
     fits a 15–30 min token well) and an emailed link
     (`/orders/view?token=...`) is sent via a transactional email
     service (Workers can't send mail directly — needs an account with
     something like Postmark/Resend/Mailgun, a new dependency to set up).
     Only clicking the real link renders the order page — proves inbox
     ownership without passwords/accounts. **Always show the same
     neutral response** ("if we have an order on file, check your
     inbox") whether or not a match was found, both to avoid leaking
     which emails have ordered and to give a wrong-email typo a soft,
     non-scary failure mode. **Needs basic rate-limiting** (a few
     attempts per IP per window, enforceable free at the Cloudflare
     edge) since this is a public endpoint that triggers a DB read and
     an outbound email per submission.
  4. **Human fallback for failed lookups — owner's explicit call.**
     Rather than engineer around every lookup edge case, a visible
     "still not finding it? Contact us with your name and approximate
     order date" link to the existing Contact page. Requires a small,
     Cloudflare-Access-gated admin page (`/admin/orders/`, one shared
     login just for the owner — configured entirely in the Cloudflare
     dashboard, no custom password/session code to write or maintain,
     same "let a specialist handle the sensitive part" instinct as using
     Square's hosted checkout instead of a custom payment form) listing
     all orders, where the owner marks status/adds a tracking number —
     this is the other half of "updated order status," the part Square
     has no way to know automatically (fulfillment, not payment).
     Plain server-rendered Astro page (`prerender = false` for just this
     route), not a JS dashboard — same pattern already used for FAQ/
     articles, just reading D1 instead of markdown.
  5. **Staff access to a plain order file, without touching Cloudflare —
     the owner's explicit operational-security ask.** A completely
     separate, decoupled piece from the Worker: a small script run on a
     schedule (proposed: cron on this same VM, every 5–15 min or
     whatever cadence feels "soon enough") that calls D1's normal HTTPS
     REST API with the owner's own API token and writes the results to
     a plain CSV file on the owner's own machine — opens directly in any
     spreadsheet program. Only this script ever holds Cloudflare
     credentials; the assistant never touches the account, dashboard, or
     token. Since it's a read-only snapshot pulled from D1 (not an
     append to a shared file), it can safely regenerate on every run
     with no race condition. How the file then reaches the assistant
     from the owner's machine (shared drive, email, etc.) is the owner's
     own existing workflow, not something this system needs to solve.
     **Explicitly rejected approach, for the record:** a Worker
     appending to a file and SFTP-ing it out directly. Two real problems
     — SFTP/SSH doesn't fit naturally in the Workers runtime (no
     built-in client, unusual to implement), and "append to a shared
     file" reintroduces the same lost-update race condition already
     ruled out for the original flat-file order-history idea (two
     concurrent orders could each read-modify-write the same file and
     silently lose one). Decoupling "write the order" (Worker → D1) from
     "get a copy to my computer" (owner's own script, pulling not
     pushing) avoids both problems at once.

  **Real sequencing dependency, same as the hosting adapter decision
  above:** none of this can be built for real yet. It needs, in order:
  the Cloudflare account created and repo connected, the `@astrojs/
  cloudflare` adapter actually added (deliberately not done yet either),
  Square finalized (still just "considering," not decided), and the
  checkout flow itself built — this order-management system is entirely
  downstream of orders actually existing to manage. Fine to keep
  refining the design in the meantime; nothing here should be built
  ahead of those.

  **Related task, same trigger point:** wiring up GA4's `purchase`
  ecommerce event (see the Google Analytics section further down) should
  happen at the same moment the Worker writes a completed order to D1 —
  one checkout-completion event, two consequences, not two separate
  efforts.

---

## 4. The chosen theme

**Creative Tim's "Astro Ecommerce"** — free, MIT-licensed UI kit.
Repo: https://github.com/creativetimofficial/astro-ecommerce
(Live demo: https://demos.creative-tim.com/astro-ecommerce/)

Owner chose this **purely for visual layout/styling** — explicitly said "how
the backend works is more up to me." Confirmed and agreed: none of the
available "Astro ecommerce" themes have a backend suited to this project
anyway (most are headless-Shopify frontends, wrong direction; others, like
this one, are static UI kits with mock data). Since the data layer is being
replaced regardless, styling fit was the right deciding factor.

**Stack:** Astro 5.5.5, React (`@astrojs/react`), react-bootstrap, Sass.
No Tailwind. TypeScript throughout components.

### What's actually in the repo (investigated directly, not guessed)

- `public/data.json` — flat mock array of generic apparel/watch products
  (title, price, description, `sizes` map of size→stock-count, colors,
  images, rating, reviews). This is placeholder data, not a real data layer.
  **Being fully replaced by the content collections.**
- Only 4 pages exist out of the box: `index.astro`, `landing.astro`,
  `product.astro`, `shopping-cart.astro`. No category/listing page, no blog —
  these need to be built new (reusing existing layout/styling).
- **Component-by-component findings:**
  | Component | Verdict |
  |---|---|
  | `src/components/products/cardProduct.tsx` | **Reusable as-is.** Clean, prop-driven, doesn't care where data comes from. Needs prop additions for genus/tags/variants, not a rewrite. |
  | `src/components/products/productSizes.tsx` | **Mostly reusable.** Maps size label → stock count, disables out-of-stock sizes already — close to our variant model. Gap: no per-size **price**, only stock count. Needs extending to carry `{label, price, stockStatus}` per variant. |
  | `src/components/products/categoryFilters.tsx` | **Cosmetic mockup only, not functional.** "Designers"/"Material"/"Size" checkboxes are static HTML with no logic wired up. Worse: it imports `data.json` directly and hardcodes `data.products.slice(0, 3)` regardless of any filter state. **Needs real rebuild of the logic; keep the visual shell/markup.** |
  | `src/pages/product.astro` | **Hardcoded to `data.products[0]`** — always shows the first mock product, no dynamic routing at all. **Needs conversion to a dynamic `[slug].astro` route** using `getStaticPaths()` over the `plants` (and `supplies`) collections. This is the single biggest structural gap found. |
  | `src/components/cart/shoppingCart.tsx` | **Visual shell only, no logic.** Takes a `products` prop and renders it — no `useState`, no cart context, no persistence (localStorage etc.), and **the Checkout button has no `onClick` handler at all** — currently does nothing. Cart state (recommend a small store like `nanostores` for cross-page persistence in a multi-page Astro site) and the Stripe Checkout wiring need to be built from scratch here. |
  | Cart line-item display, badges, galleries | Likely reusable, same pattern as `cardProduct` — not yet deep-dived. |

None of the above was surprising once confirmed — it's an expected shape for
a demo/mockup kit, not a red flag about code quality. The useful output of
this investigation is knowing exactly which files need light edits vs. real
rebuilds vs. net-new work, so scope is honest and contained.

---

## 5. Content collections (rebuilt on claude-vm, 2026-07-27)

Note: this schema and the 5 sample entries were originally built and
validated on claude-mac's clone, but the commit+push to
`halyx800/astro-ecommerce` was never confirmed done and did not land on
GitHub. Rebuilt directly on the Debian VM from this spec on 2026-07-27.

```
src/
├── content.config.ts          ← schema definitions (plants, supplies, articles)
└── content/
    ├── plants/
    │   ├── oncidium-sharry-baby-red-fantasy.md    (common clone, 2 pot-size variants)
    │   ├── cattleya-walkeriana.md                 (species, one variant low-stock)
    │   └── paphiopedilum-rothschildianum-division-a.md  (rare one-off division, quantityAvailable: 1)
    ├── supplies/
    │   └── keiki-power-pro-cloning-paste.md
    └── articles/
        └── growing-dendrobium-kingianum.md
```

`content.config.ts` uses **Astro 5's Content Layer API** (`glob()` loader —
this is the correct pattern for Astro 5.5.5; older `src/content/config.ts`
style configs are for pre-5.0 Astro, don't use that pattern here). Defines
three collections:

- **`plants`** — genus, species, `taxonomicStatus` (`species`/`hybrid`,
  **optional** — see note below), hybridName, cultivarName,
  commonName, displayName, type (`clone`/`division`/`seedling`/`mystery`),
  rarity, `variants[]` (label/price/stockStatus/optional
  quantityAvailable), top-level `stockStatus`, `tags[]`, `images[]`,
  featured, publishDate.

  **`taxonomicStatus` design note (2026-07-31):** originally modeled as a
  required `isHybrid: boolean`, replaced after the owner flagged that
  orchid taxonomy has genuine, unresolved edge cases a boolean can't
  represent — naturally-occurring hybrids that some botanists classify as
  species in their own right, disagreement between taxonomists, and
  man-made recreations of natural hybrids (owner's example: *Paph.
  conco-bellatulum* is the man-made form of the naturally-occurring
  hybrid/putative-species *Paph. wenshanense*). `taxonomicStatus` is now
  an **optional** enum (`species` | `hybrid`) — omitting it entirely
  represents "undetermined/not yet classified," rather than forcing a
  guess. This matches how `species`/`hybridName`/`cultivarName` are
  already simple optional fields with no cross-validation between them —
  deliberately not a discriminated union, to keep the schema simple.
- **`supplies`** — simpler: name, category enum, variants, stockStatus,
  tags, images, featured.
- **`articles`** — title, category enum (`growing`/`science`/`general`),
  publishDate, tags, coverImage, excerpt.

To validate: run `yarn astro sync` (schema/type generation) and `yarn astro
build` after installing dependencies.

---

## 6. Git / workflow setup

- Owner's GitHub username: **halyx800**. Fork of the Creative Tim theme at
  **github.com/halyx800/astro-ecommerce**.
- Auth: HTTPS + personal access token (stored via git credential helper on
  each machine). SSH keys not yet set up anywhere.
- **Agreed workflow going forward:** changes should be delivered as
  something the owner reviews before landing — diffs shown before
  committing — NOT wholesale file dumps or autonomous commits/pushes without
  review. This matches their explicit preference for inspecting everything
  and avoiding bloat creep.
- On claude-vm specifically: direct file edits (for iteration speed) with
  `git diff` shown before every commit; commits happen locally but are not
  pushed to GitHub without the owner's go-ahead.

---

## 7. Package manager — yarn only

- **Yarn 4.17.1 via Corepack** is canonical across both the Mac and the
  Debian VM — confirmed matching versions on both. Pinned in `package.json`
  via `"packageManager": "yarn@4.17.1"`.
- Yarn 4 defaults to Plug'n'Play (no `node_modules`), which is incompatible
  with this project's dependency set (Astro + React + Sass native bindings).
  `.yarnrc.yml` sets `nodeLinker: node-modules` to avoid PnP resolution
  errors.
- **Do not use npm on this project.** Don't regenerate `package-lock.json`;
  only `yarn.lock` should be committed.

---

## 8. Environment notes

- **Mac**: macOS 11.6 (Big Sur), Apple Silicon (arm64). Known limitation, by
  design, not a bug to fix: this OS is old enough that modern prebuilt
  native binaries (esbuild, and likely others) fail with a missing-symbol
  error (`_SecTrustCopyCertificateChain`) because they expect macOS 12+
  Security framework APIs. **Decision: not upgrading macOS right now.** The
  Mac is used only for git operations (clone/edit/commit/push, reviewing
  diffs) and browser preview of whatever the VM builds — not for running
  `yarn install`/`yarn dev`/`yarn build` locally. Don't propose fixing this
  by getting builds working on the Mac; that's out of scope by choice.
- **Debian VM (Google Cloud)**: the actual, primary development and build
  environment for this project. Treat it as the source of truth for "does
  this actually run."
- **Remote access while traveling**: Termius (SSH client) on Mac and iPad,
  connecting directly to the Debian VM — chosen deliberately over Claude
  Code's "Remote Control" feature since plain SSH already covers the need.
  The Cloud Console's browser-based SSH (IAP tunnel) is a fallback that
  works regardless of the VM's firewall SSH source-range configuration,
  useful if Termius can't reach the VM from wherever the owner is
  travelling.

---

## 9. Next steps

In rough order of dependency:

1. ~~Run `yarn install` on the VM... confirm `yarn astro sync` + `yarn astro
   build` succeed.~~ **Done (2026-07-29/30).**
2. ~~Wire `cardProduct.tsx` and `productSizes.tsx` up to real collection
   data.~~ **Done (2026-07-30).** Both now accept optional `genus`/`tags`/
   `variants` props alongside the original apparel-shaped props (additive,
   nothing existing broke — verified via `yarn build`). Also added a
   required `sku: z.string()` field on the shared `variant` schema (format
   `OI-{ABBREV}-{SIZE}`, e.g. `OI-KPP-5g` — a plain string, no format
   enforced in the schema itself, so the convention can change later
   without a schema edit). `content.config.ts` was also refactored so
   `plants`/`supplies` both `.extend()` one shared `baseProduct` Zod schema
   (`variants`/`stockStatus`/`tags`/`images`/`featured`) instead of
   duplicating those fields — a future product type just extends the same
   base.
3. **In progress:** convert `product.astro` into dynamic routes —
   **decided: separate `/plants/[slug]` and `/supplies/[slug]`** (not one
   shared `/product/[slug]`), via `getStaticPaths()` per collection. Chosen
   over a shared route to avoid slug-collision risk across collections and
   to keep each template free of type-branching logic. Known gaps found
   while investigating this page, to be handled as part of this work:
   - `productGallery.tsx` hardcodes exactly 4 images as `{src, alt}`
     objects (`images[0..3].src`) — will crash on real entries, which have
     `images: string[]` (plain paths, often just 1). Needs a real rewrite,
     not just new props.
   - `productOverviewGrid.tsx` still only accepts the old apparel-shaped
     props (`colors`/`full_description`/`highlights`/`details`/`rating`/
     `reviews`/`sizes: Map`) — needs the same additive extension already
     done for `cardProduct`/`productSizes`.
   - Pre-existing bug, unrelated to this migration: `productOverviewGrid.tsx`
     checks `price.length != 0` where `price` is a `number` — always
     falsy, so the demo's own price display silently never renders today.
   - **Decided:** the bottom "customers also purchased" grid and the
     ratings/reviews section (both `data.json`-driven, no schema
     equivalent) will be **kept as visual placeholders** for now so page
     layout doesn't shift — not wired to real logic yet. See below for
     the intended direction for each.
4. Build genus/category listing pages and tag index pages (net new pages,
   reusing existing layout/component styling) — this replaces
   `categoryFilters.tsx`'s hardcoded logic with real filtering.
5. Build blog listing + article detail pages from the `articles` collection.
6. ~~Build real cart state~~ **Cart state done (2026-07-30), checkout/payment
   still not started.** `nanostores` + `@nanostores/react` +
   `@nanostores/persistent` installed (rejected Medusa/Crystallize, see
   decision below — this is deliberately the only new infra). Cart lives
   in `src/lib/cart.ts`: a single `persistentAtom` keyed by variant `sku`,
   each entry a full snapshot (sku/title/price/thumb_src/href/quantity)
   captured at add-to-cart time — **known tradeoff:** if a price is edited
   and the site rebuilt later, an item already sitting in someone's cart
   keeps the old price until removed and re-added; accepted as low-stakes
   since carts are normally completed same-session.
   `productOverviewGrid.tsx` now tracks selected variant and has a real
   "Add to cart" button (`client:load` added on both `/plants/[slug]` and
   `/supplies/[slug]` — required for any onClick/onChange to actually run,
   since Astro ships zero JS by default); `shoppingCart.tsx`/
   `productCartItem.tsx` read live from the store with working
   quantity-change/remove; `shopping-cart.astro` no longer touches
   `data.json`. Dropped `orderSummary.tsx`'s tax/shipping lines entirely
   for now — they were hardcoded fake placeholder numbers (flat $7 tax,
   $25/free-over-$100 shipping) that also contradicted the page's own
   "tax included, shipping calculated at checkout" caption; only a real
   subtotal is shown until real tax/shipping logic (or a payment
   provider's built-in calculation) is in place. Checkout button is
   present but intentionally disabled — still blocked on payment provider
   + hosting choice (see §3 inventory note and the build-vs-buy decision
   below, both of which depend on that same choice).
   **Bugs found via the owner actually testing in-browser, fixed same
   session:** cart rows were wrapped in an `<a>` around the quantity
   `<input>` (invalid nested-interactive-elements HTML), which caused
   editing quantity to trigger navigation back to the product page — fixed
   by only linking the thumbnail/title, not the whole row. Remove "×" used
   a FontAwesome class (`fas fa-times`) that was invisible because this
   theme only loads Bootstrap Icons, not FontAwesome — swapped to
   `bi-x-lg`. Also fixed a misleading flash where the cart page said "Your
   cart is empty" for a moment on every load before client-side JS read
   `localStorage` — now shows an honest "Loading your cart…" until
   mounted, since Astro's server-render pass has no access to the
   browser's `localStorage`.
7. ~~Decide guest-only checkout vs. accounts~~ **Decided: guest-only.**
   Capturing email for orders/marketing doesn't require accounts — hosted
   checkout flows collect email regardless. Still open: final social media
   approach; logo integration; sourcing real product photography
   (frontmatter image paths are currently placeholders, no actual image
   files yet).

**Recommended products — built 2026-08-01.** Hand-curated, per the
2026-07-30 decision below — no algorithm, no tag/genus-derived
"similarity." A new optional `relatedProducts` field on `baseProduct` in
`content.config.ts`, authored directly in whichever listing's frontmatter
you're editing (co-located with the item it belongs to, same vim
workflow as everything else):
```yaml
relatedProducts:
  - collection: "plants"
    id: "cattleya-walkeriana"
  - collection: "supplies"
    id: "keiki-power-pro-cloning-paste"
```
**Real bug found and fixed while building this:** the first attempt used
a bare `z.union([reference("plants"), reference("supplies")])` with
plain slug strings. This silently always resolved to whichever
collection was listed *first* in the union, regardless of which
collection the slug actually belonged to — it only failed at build time
if that first guess happened to be wrong (confirmed by deliberately
testing a plant→supply reference, which broke with "Entry plants → X was
not found" even though X was a real supply). Fixed with
`z.discriminatedUnion("collection", [...])`, requiring each entry to
state its own collection explicitly — more to type, but Zod then
validates against the *correct* collection instead of guessing. Also
manually verified a genuinely nonexistent slug still fails the build
loudly (not silently) with the discriminated version.

One-directional by design: adding a reference on listing A doesn't
automatically show A on listing B's page — matches real merchandising
("people who bought X also like Y" isn't always symmetric) and keeps the
frontmatter WYSIWYG. Rendering: `/plants/[slug]/` and `/supplies/[slug]/`
resolve references at build time via `getEntries()`, reusing
`cardProduct.tsx` — section doesn't render at all if a listing has none
(verified: the Paphiopedilum division has no `relatedProducts` and shows
nothing between its description and Reviews). The shopping cart page is
different — it doesn't know what's in someone's cart until their browser
runs, so it can't resolve at build time. Added `src/pages/
product-index.json.ts` (same pattern as the search index, but separate —
didn't want to bloat the search index with full variant/image data it
doesn't need) — the cart's client-side JS fetches this, cross-references
by SKU which product each cart item belongs to, aggregates each one's
`relatedProducts`, excludes anything already in the cart, and caps the
total at `RECOMMENDATION_LIMIT` (currently 4, in `shoppingCart.tsx`).

**Reviews — raised 2026-07-30, revisited in depth 2026-08-03. Deferred
until the catalog grows; no design/build yet.** Three genuinely separate
pieces got untangled in the 2026-08-03 discussion:
1. **The `Review`/`AggregateRating` schema itself** — cheap to build
   whenever wanted (same pattern as `buildProductSchema()`/
   `buildArticleSchema()`), but only safe to publish if the ratings
   inside it come from a genuine, non-cherry-picked collection process.
   Google's policy explicitly bans self-selected/curated ratings in this
   schema — violating it risks a sitewide manual action on structured
   data, not just a lost rich snippet.
2. **A real buyer-submission pipeline** — the actually expensive part,
   and expensive for the same reason the account/order-history idea was
   (this site is static, no live backend). Needs a public write path,
   moderation, storage, and a way for new reviews to reach the built
   HTML (rebuild-on-approval or client-side fetch). Same build-vs-buy
   fork as the Medusa/Crystallize cart decision: build it, or buy into a
   third-party reviews app (Judge.me/Yotpo/Loox etc.) that hosts
   collection+moderation+widget and usually emits compliant schema
   itself.
3. **Hand-curated reviews** — zero infrastructure, same pattern as
   recommended products/blog priority. Real value: on-page conversion
   trust + unique page text, shown as plain testimonial text (no
   schema). Structurally can't be the source for #1's schema, since
   curation can't satisfy the "genuine, non-cherry-picked" requirement.

**Decision: not worth building the real pipeline (#2) right now.** Rich
snippets (the piece #2 uniquely unlocks) boost search *click-through*
at whatever position you already rank — Google has said it's not a
ranking-position factor — and the size of that boost is proportional to
how much organic search traffic product pages already get. With the
current small catalog, per-product organic search volume is likely
long-tail/low, so the absolute payoff is small relative to the
engineering (or vendor) cost. The cheap win available right now — plain
hand-curated testimonials for on-page conversion, plus leaning on real
Google Business reviews for local-search trust — doesn't require any of
this and isn't blocked by the deferral.
**Revisit trigger, not a timer:** come back to this once the catalog and
per-product organic traffic have grown enough that a CTR lift would be
a meaningful number of extra clicks, or once competitors' listings start
showing stars next to ours in search results.

**FAQ consolidated to a single file — 2026-08-03.** Was previously one
`.md` file per question (matching the plants/supplies/articles pattern),
each with `question`/`order` frontmatter, rendered as a Bootstrap
accordion. Owner pointed out this page will rarely change and asked for
one file instead. Reworked:
- `content.config.ts`: `faqs` schema dropped to `z.object({})` — no more
  per-entry metadata; a question is now just a `##` heading in the body.
- Single file: `src/content/faqs/faq.md`, edited directly in vim, one
  `##` heading per question followed by normal Markdown for the answer
  (bold/italics/bullets/links all work as usual). Includes a
  commented-out `<!-- ## ... -->` template block as a copy-paste
  reference for adding more questions — HTML comments pass through the
  Markdown renderer untouched, so it's invisible on the live page but
  visible in the source file.
- `src/pages/faq/index.astro`: swapped `getCollection` + accordion loop
  for a single `getEntry('faqs', 'faq')` + one `<Content />` render —
  flows as plain sectioned content (same rendering pattern as articles/
  blog posts), no accordion JS needed anymore.
- Fixed a heading-level collision this surfaced: the page's own title
  was already `<h2>` (pre-existing, predates this session's SEO audit,
  which focused on product pages specifically and didn't touch this
  page), and now each question is also `<h2>` — two identical heading
  levels with no real hierarchy. Fixed the page title to `<h1 class="h2
  mb-4">`, same sizing-utility-class trick used for the product-page H1
  fix in the SEO audit, so questions now correctly nest under it with no
  visual change.
Internal links inside `faq.md` still need the manual `/astro-ecommerce`
prefix (see note in the growing-instructions/contact discussion) until
`base` is removed.

**Blog posts vs. articles (raised 2026-07-30):** these are two distinct
content types, not two names for the same thing.
- **Articles** = the existing `articles` collection (long-form growing
  guides / orchid science, matches the old WooCommerce "Growing Info" /
  "Orchid Science" categories). Schema already exists; pages being built
  now under `/articles/`.
- **Blog posts** = a separate, not-yet-built concept — shorter, more
  frequent updates, meant to eventually connect with X/Facebook/Instagram.
  **Confirmed direction:** hand-written Markdown per post (fits the
  flat-file model, same as everything else), which may reference/embed
  video — but **video is never hosted on Astro/this site itself**, only
  linked to or embedded from wherever it actually lives (X, YouTube,
  etc.). No schema designed yet; needs its own collection distinct from
  `articles` (different fields — likely no `category` enum, possibly a
  `videoUrl`/embed-reference field). Not started — deliberately deferred
  to its own discussion, separate from this bucket's article pages.

**Build-vs-buy for cart/checkout (decided 2026-07-30):** considered and
**rejected** adopting a third-party commerce platform (Medusa — self-hosted,
requires running its own server + Postgres database continuously, in
addition to this static site; Crystallize — hosted SaaS, would move the
product catalog off-git into their system). Both would reintroduce the
"opaque stack I can't fully inspect, that breaks when a dependency
updates" pattern that caused the original WordPress/WooCommerce/Bluehost
incident — Medusa by adding a second live service to operate and keep in
sync with the content collections, Crystallize by moving the catalog out
of git entirely. **Decision: build a custom, deliberately small cart**
(nanostores for state + whichever payment provider's hosted checkout),
explicitly so the owner understands and controls every piece of it.
Nanostores itself is not a commerce alternative — it's a plain
client-state library, one ingredient of the custom-cart approach, not a
competing option to it.

**Abandoned-cart email capture (raised 2026-07-30, not yet decided):**
splits into two different cases depending on what "abandoned" means:
(1) customer starts the payment provider's hosted checkout but doesn't
finish — the provider likely already has their email, since hosted
checkout flows typically collect it before payment details; may already
be solvable via whichever provider's own incomplete/expired-session data,
worth checking once a provider is chosen, rather than building custom.
(2) customer adds items to the on-site cart but never reaches checkout at
all — no payment provider knows this happened, so recovering this case
needs a deliberate, separate early-email-capture prompt somewhere in the
cart UI itself (e.g. "save your cart"). Owner hasn't said which case(s)
they actually want covered — don't build case-2 capture without asking.

**Site search (built 2026-07-31):** client-side, no live backend — matches
the static-first architecture. `src/pages/search-index.json.ts` generates a
static JSON index at build time (title, genus/category, tags, standard
genus abbreviation, URL) for every plant/supply/article.
`src/lib/orchidAbbreviations.ts` maps standard orchid genus abbreviations
(C., Den., Onc., Paph., Phal., etc.) to full genus names so searching "Den"
surfaces Dendrobium content. `src/components/search/SearchBox.tsx` (in the
navbar) is a plain form — submitting navigates to `/search/?q=...`, a
dedicated results page (`src/pages/search/index.astro` +
`SearchResults.tsx`) that fetches the index and runs fuzzy matching via
Fuse.js only on that page, not the navbar, so most visitors never load it.
Chose hand-rolled index + Fuse.js over Pagefind (a purpose-built static-site
search tool, e.g. used by Astro's own docs) specifically to keep this
piece small and fully understood, matching the reasoning behind picking
nanostores over a bigger cart platform.

**Known tuning tradeoff:** `threshold: 0.35` in `SearchResults.tsx`
controls fuzzy tolerance. Owner found searching "kingianum" also
incorrectly surfaces "rothschildianum" (both share the common Latin
species-name suffix "-ianum" plus several other overlapping letters) —
same permissiveness that lets real typos match also lets superficially
similar-but-unrelated botanical Latin cross-match. Not fixed yet —
**owner explicitly wants**, at some future point, a systematic test pass:
run a batch of realistic queries (partial words, real misspellings,
genus abbreviations) against real catalog content and produce a results
table (query → matches returned, in rank order) to actually evaluate
match quality empirically before tuning `threshold`/`distance`, rather
than guessing at one number. Best done once there's more real catalog
content to test against, not just the current 5 entries.

**Contact page + Google Business Profile prep (built 2026-07-31):** owner
hasn't signed up for GBP yet but wants the site ready for it — real NAP
data now lives in one shared file, `src/lib/businessInfo.ts`, used by both
the visible `/contact/` page and a sitewide `GardenStore` (Schema.org)
JSON-LD block in `Layout.astro`, specifically so the two can't drift out
of sync with each other later. Real walk-in address: 800 Vanesa Lane, Ste
E, Wylie, TX 75098. Real email: orchidinsanity@gmail.com (owner asked
whether `@gmail.com` hurts rankings — no confirmed evidence it affects
Google's algorithm directly; the real factor is customer-facing
credibility, not a technical SEO penalty; a custom-domain address
forwarding to the same inbox is a nice-to-have, not required).
**Two things that must be fixed before real launch:**
- **Phone number is a placeholder** (`(972) 555-0100` /
  `+19725550100` in `businessInfo.ts`) — deliberately using the
  industry-reserved fictional "555-01xx" block with a real Wylie-area
  code, not a real number. Owner doesn't have a real number yet.
- **Hours are not set** — owner said likely a mix of set hours plus
  by-appointment. Contact page currently just says so in plain text;
  structured data has no `openingHoursSpecification` at all yet (left out
  entirely rather than guessing at fake hours). Add real hours to both
  places once decided.

Also fixed while in this area: `Layout.astro` had zero meta description
support before this (now takes an optional `description` prop, sitewide
default provided) — a real, pre-existing SEO gap unrelated to Contact/GBP
specifically, worth knowing about.

**FAQ + Growing Instructions (built 2026-07-31):** matches the live
site's nav (`Shop | Blog & Articles | Growing Instructions | FAQ |
Contact`), all wired into `navbar.tsx` and `footer.tsx`.
- **`faqs`** is a new content collection (`question` frontmatter +
  Markdown answer body), same one-file-per-item pattern as everything
  else. `/faq/` renders it as a Bootstrap accordion — no JS/React
  needed, pure `data-bs-toggle` behavior already loaded sitewide. Only
  one placeholder entry exists (a safe, non-policy example question) —
  owner needs to write the real Q&As; deliberately did not invent
  answers touching shipping/returns/guarantees, since a wrong guess left
  unedited on a real Q&A page could actually mislead a customer.
- **Growing Instructions — corrected 2026-07-31.** First built as a
  filtered view of the `articles` collection (`category: "growing"`),
  reusing the existing `/articles/category/growing/` page's data. **This
  was wrong** — owner clarified Growing Instructions must be a fully
  standalone page, structurally separate from `articles` entirely: "It's
  not a repository for articles with information specific to growing
  certain orchid types," just simple, general orchid care instructions.
  `/growing-instructions/index.astro` now has zero dependency on the
  `articles` collection — just a placeholder ("coming soon") until real
  content exists. The original `/articles/category/growing/` filtered
  view (showing the "Growing Dendrobium kingianum" article) still exists
  unchanged as its own separate feature — general "browse articles by
  category," not what the Growing Instructions nav item points to.
  **Not yet decided:** how the owner wants to author this page's real
  content — a single Markdown file (matching the vim-authored pattern
  used for every other content type), or edited directly in the `.astro`
  page itself. Didn't invent placeholder care instructions (light/water/
  temperature specifics) for the same reason as FAQ answers, but higher
  stakes here — wrong care advice could actually harm a customer's plant,
  not just look unpolished.

**Frontmatter quoting/comma helper tool (raised 2026-08-01, not built
yet):** owner keeps forgetting quotation marks (and commas in list
fields) when hand-writing frontmatter in vim — says this bit him
similarly on a prior, cruder plant-listing markup system he built before
this project. Wants tooling help with this eventually.

**Rejected approach:** author in a new no-quotes-needed `.mdpre` source
format, with a preprocessor compiling it into the real `.md` file. Pushed
back and owner agreed — this reintroduces exactly the complexity this
whole project has avoided everywhere else: two files per listing (which
one is "real"?), staleness/sync risk if both get committed or the
generated one gets hand-edited by mistake, and — the harder problem — a
preprocessor that strips quotes entirely can't safely tell where a
string value begins/ends without also understanding the schema (is this
field a string, a list, a number?), which means it would need updating
every time `content.config.ts` changes. Real ongoing coupling, just to
avoid typing quote marks.

**Agreed direction instead:** a small, schema-aware fixer that edits the
**same** `.md` file **in place** — write loosely, run one command, it
adds missing quotes to string fields (using the real schema to know
which fields are strings, not guessing) and rewrites that exact file.
Scoped only to the frontmatter block between the `---` fences — must
never touch the prose body. One file the whole time, nothing to keep in
sync, no new file format. Separately worth solving: the comma pain is
really about *list* fields specifically (`tags`, `images`) — a friendlier
input for those (e.g. one tag per line) that the same tool assembles into
proper YAML array syntax, rather than a general "no punctuation anywhere"
goal. An established YAML linter (e.g. `yamllint`) was raised earlier
as a reference/building block, though the schema-aware auto-fixing part
goes beyond what a generic linter does out of the box. Not built —
next discussion should nail down exact behavior before writing it.

**Google Analytics — placeholder wired in 2026-08-02, real ID still
needed.** The old Creative Tim GTM container (`GTM-NKDMSK6`, flagged
2026-07-31, reported to an account owner had no access to) has been fully
removed, not just left broken. Replaced with a direct GA4 tag (decided
against keeping the GTM middle-layer, per 2026-08-01 discussion — owner
prefers understanding every piece over configuring tags in a separate
GTM dashboard) that's conditionally rendered from a single placeholder:
`GA_MEASUREMENT_ID` in `src/lib/analytics.ts`, currently `""`. Two
deliberate safety properties, both verified via a real build:
- **Renders nothing at all while the ID is empty** — confirmed no
  GTM/gtag/analytics traces anywhere in built output right now.
- **Only fires in production builds, never `yarn dev`** — gated on
  `import.meta.env.PROD` in `Layout.astro`, specifically so all the
  testing/curl traffic this VM generates never counts as real visitors
  once a real ID is added.

To finish: owner creates a free GA4 property (steps discussed
2026-08-01 — decided to use `orchidinsanity@gmail.com`, not a personal
account, for the same handoff-access reason as Google Business Profile),
gets the Measurement ID (`G-XXXXXXXXXX`), and it's a one-line edit in
`src/lib/analytics.ts` to go live.

**Open task, added 2026-08-05: wire up GA4's `purchase` ecommerce event
at checkout completion, not just page views.** Raised from a real
observation on the WooCommerce site being migrated away from: its
native order-attribution feature ties completed sales to a specific
traffic source (owner noticed several sales attributed to ChatGPT
referrals). The placeholder GA4 setup above only tracks page views —
that only attributes *visits* to a source, not completed *purchases*.
To get the same "this specific sale came from X" visibility WooCommerce
already provides, the checkout flow needs to fire GA4's `purchase` event
(order total, items, transaction ID) via `gtag()` at the moment an order
completes — GA4 then automatically ties that event back to the
visitor's original session source. **Natural point to build this:** the
same moment the Worker writes a completed order into D1 in the
order-management system (see the scoped design above) — checkout
completion is one event with two consequences (write to D1, fire GA4's
purchase event), not two separate features. Not yet built — blocked on
the same prerequisites as the order-management system (Cloudflare
account, Square finalized, checkout itself built) plus a real GA4
Measurement ID actually existing.

**Blog posts — full design resolved 2026-08-01, not built yet.**
- New `blogPosts` collection: title, Markdown body, tags (no category —
  deliberately, see reasoning below), `publishDate`, optional `videoUrl`
  (external only, never hosted here), optional `image`, and a structured
  product-reference field (same `reference()`/discriminated-union pattern
  as `relatedProducts`, reused for a different purpose: letting a post
  point at a real catalog product, e.g. a post about Den. kingianum
  linking the actual Dendrobium listing if one exists).
- **Same structured product-reference field is also being added to
  `articles`** — found while designing this that articles currently have
  *no* way to link to a real product at all, same gap, same fix.
- **Tags, not categories, for blog posts** — owner's WordPress background
  raised categories, but on reflection blog posts (photos, video updates,
  customer stories) are too varied for a fixed enum the way articles'
  growing/science/general works. Tags (already unified sitewide) cover
  it; blog posts just join that existing system.
- **URL structure**: `/blog/[slug]/` for individual posts (separate from
  `/articles/[slug]/`, keeping the two collections/URL spaces distinct).
  `/articles/` becomes the combined "Blog & Articles" landing page — but
  **two separate sections** (Articles, then Blog Posts), each sorted by
  its own date — explicitly *not* one interleaved chronological feed,
  per owner's preference. No nav changes needed; "Blog & Articles" already
  points at `/articles/`.
- **Popularity/ranking — manual, not measured.** Same reasoning applied
  as everywhere else on this project (inventory, order history, reviews,
  recommended products): real measured popularity needs either a live
  view-counter (same "static site has nowhere to write" problem as
  inventory) or a Google Analytics integration pulled back into the build
  via a periodic job — real infrastructure, not a small add-on, and only
  as fresh as the last time that job ran. Owner chose the simple path
  instead: an optional `priority` field, same pattern as `featured` on
  products and `order` on FAQs — unset posts sort by date, a set value
  bubbles a post to the top. Owner's own knowledge of what did well on
  social media is real signal a same-site counter wouldn't even capture
  anyway, since the engagement mostly happens on the platform hosting the
  video, not here.

**Built 2026-08-01**, matching the design above exactly. New `blogPosts`
collection (`src/content/blog/`), `/blog/[slug]/` pages, `/articles/`
rebuilt into the two-section landing page, tag system and search index
both extended to include blog posts. `productReference` (the
`relatedProducts`/`mentionedProducts` shape) factored into one shared
schema piece in `content.config.ts` since three different fields now use
it identically. One sample post (`first-bloom-of-the-season.md`)
validates the whole path end to end, including a real cross-reference to
the Oncidium product, rendered as a "Shop this post" card. Blog posts
don't have a hand-written excerpt field (kept authoring lightweight,
matching the casual/quick framing) — `src/lib/excerpt.ts` auto-generates
a short preview from the post body instead, strips Markdown syntax,
truncates to ~150 characters.

**Open Graph tags — built 2026-08-02.** Raised during a social-media
integration discussion (owner setting up Instagram/TikTok/Facebook
business accounts) — controls how a link looks when shared/pasted
anywhere (Facebook posts, Instagram DMs, iMessage, Slack, etc.): a real
photo + title + description card instead of a bare/ugly link. Directly
relevant to driving clicks from social back to the site.

`Layout.astro` now takes optional `description`/`image`/`type` props and
emits `og:site_name`, `og:type`, `og:title`, `og:description`, `og:url`,
`og:image`. **Deliberately built to need zero new frontmatter fields from
the owner** — every content type already had what's needed:
- Plants/supplies: `images[0]` for the photo; description auto-generated
  from the Markdown body via `src/lib/excerpt.ts` (same helper already
  built for blog post previews).
- Articles: already had a hand-written `excerpt` field — used directly.
- Blog posts: `coverImage` for the photo; same auto-generated excerpt as
  plants/supplies.

`BrowseLayout.astro` (used by plant/supply/genus/category/tag pages) now
forwards these three props through to `Layout.astro` — it only forwarded
`title` before this. Verified via real build output across all four
content types (plants, supplies, articles, blog posts) — correct titles,
correct auto-generated or hand-written descriptions, correct absolute
image/page URLs (including the `/astro-ecommerce` base path).

X/Twitter has its own similarly-named "Twitter Card" tags but falls back
to standard Open Graph tags when Twitter-specific ones aren't present —
didn't bother adding Twitter-specific tags separately.

**OG title/description overrides — built 2026-08-02.** Owner wanted a
catchier social blurb than what shows on the actual listing (e.g. a
punchy hook rather than the accurate taxonomic title). Added optional
`ogTitle`/`ogDescription` to all four content types (`seoOverrides`
object spread into `baseProduct`, `articles`, `blogPosts` in
`content.config.ts`) — when set, only the *share preview* changes; the
real on-page `<title>`/description are untouched. Verified with real
data: the Oncidium listing now has
`ogTitle: "This orchid smells like chocolate 🍫"` — its actual page
`<title>` still correctly reads "Oncidium Sharry Baby 'Red Fantasy'",
while `og:title` uses the override. Confirmed the Cattleya listing
(no override set) still correctly falls back to its real title/excerpt,
unaffected.

**SEO audit (2026-08-02) — real findings, prioritized, most not yet
fixed:** verified directly against built HTML output, not guessed.
- **High impact:** product pages (plants/supplies) have **no `<h1>` at
  all** — the title renders as `<h2>` in `productOverviewGrid.tsx`. Real
  gap on the most important pages on the site. Product photo alt text is
  generic (`"Product image 1"`, from the fallback logic in
  `productGallery.tsx` when it isn't handed the real product title) —
  hurts accessibility and image-search visibility. No XML sitemap, no
  `robots.txt`.
- **Lower priority, real:** no `Product` structured data (Schema.org) on
  plant/supply pages, no `Article`/`BlogPosting` structured data on
  articles/blog posts — only sitewide `GardenStore` business identity
  markup exists currently. No custom 404 page.
- **Already solid, confirmed working:** meta descriptions, canonical
  tags, Open Graph (incl. the new per-listing override capability),
  business structured data, real multi-page architecture (no
  View-Transitions/SPA pageview-tracking problem, see earlier note),
  clean semantic URLs.
**All 4 high-impact items fixed 2026-08-02/03, verified against real
build output:**
- **H1 fix**: `productOverviewGrid.tsx` product title changed from `<h2>`
  to `<h1 className="h2 mt-4">` — real `<h1>` semantically, same visual
  size as before via Bootstrap's `.h2` sizing-only utility class (decouple
  semantic level from visual size), so no visual regression.
- **Alt text fix**: `productOverviewGrid.tsx` now builds real
  `{src, alt}` pairs using the actual product title before handing images
  to `productGallery.tsx`, instead of passing raw strings and falling
  back to its generic `"Product image N"` labels. Confirmed: Oncidium's
  photo now has `alt="Oncidium Sharry Baby 'Red Fantasy'"`, not
  `"Product image 1"`.
- **Sitemap**: added `@astrojs/sitemap` (official Astro integration) to
  `astro.config.mjs`, with a `filter` excluding the two JSON data
  endpoints (`search-index.json`, `product-index.json`) — confirmed the
  generated sitemap has exactly 29 URLs, matching the real page count,
  none of them data endpoints.
- **`public/robots.txt`**: added, points at the sitemap.

**One real caveat tying this to the still-open `base` path question**:
the sitemap's own URLs, and `robots.txt`'s reference to it, currently
include `/astro-ecommerce` (matching the site's current `base` config,
inherited from Creative Tim's GitHub Pages setup — see earlier note this
needs revisiting before real deployment). If/when `base` gets removed for
production, both the sitemap content and `robots.txt`'s Sitemap: line
need a matching one-line update, or search engines will be told the
sitemap lives at a URL that no longer exists.

**Internal linking as a ranking factor — flagged 2026-08-02, reviewed
2026-08-04 by walking the real link graph (every page + every component
that emits an `href`), not a generic checklist.**

Findings, by severity:
- **Orphan `/articles/category/` section — cut entirely, 2026-08-04.**
  Both `src/pages/articles/category/index.astro` and every
  `/articles/category/{slug}/` page had zero inbound links from anywhere
  on the site (not nav, footer, sidebar, `/articles/`, or individual
  article pages) — only reachable by exact URL or via the sitemap crawl,
  which got them indexed but with no internal-link signal. Also found in
  the same discussion: unlike `genus` (shown, if unlinked, on every
  product page/card), `category` wasn't displayed anywhere on an
  article's own page either — the only place it was used at all was
  these two disconnected pages. **Decision: cut, not wire in.** Owner's
  reasoning: with a small number of articles, one flat list (already
  what `/articles/` shows) is enough for humans to scan, and `tags`
  already covers real cross-cutting organization; a dedicated
  category tree only earns its keep once tags alone stop being enough
  to organize a much larger set of articles — a real future trigger, not
  a timer.
  Removed: `category` field from the `articles` schema in
  `content.config.ts` (was `z.enum(["growing", "science", "general"])`),
  both `src/pages/articles/category/*` files, and the `category: "growing"`
  line from the one existing article's frontmatter. Verified via rebuild:
  28 pages (down from 30), `/articles/growing-dendrobium-kingianum/`
  still builds correctly, no other component referenced the field.
  **If this gets revisited later** (per the owner's own trigger above),
  a category field can be re-added to the schema the same way — this
  wasn't a structural dead end, just removed because it wasn't earning
  its keep yet.
- **Genus names are shown as plain, unlinked text everywhere**
  (`cardProduct.tsx` grid tiles and `productOverviewGrid.tsx`'s single
  product-detail hero) instead of linking to `/plants/genus/{slug}/`.
  Would be high-leverage to fix (one shared component, ripples across
  nearly every page that shows a plant) but has a real clutter cost in
  the repeating grid-tile case — `cardProduct.tsx` is reused on
  `/shop/`, `/tags/{tag}/`, `/supplies/category/{category}/`,
  `/plants/species/`, homepage featured, "You might also like," "Shop
  this post," and the cart recommendations widget, so linking it means
  one link per card, not one per page. One case is worse than generic
  clutter: on `/plants/genus/{genus}/` itself, every card in the grid
  would show the *same* genus as a link back to the page you're already
  on — a genuinely redundant link, not just visual noise. The single
  product-detail page (`productOverviewGrid.tsx`) doesn't have this
  problem — genus appears once per page there, low clutter risk either
  way.
  **Decision: hold off on both for now — explicitly flagged to revisit
  once the site moves into a testing phase** (real user feedback on
  whether the grid feels cluttered is more useful here than guessing at
  it now, especially with a 3-plant test catalog too small to judge
  visual density).
  Also worth doing at the same time if this gets revisited: supply
  product pages currently show/link no category at all on the page
  itself (asymmetric with plants showing a genus label, even unlinked).
- **Lower severity:** `/plants/genus/`, `/supplies/category/`, and
  `/tags/` (the "browse all X" index pages) each have exactly one
  inbound link, from the homepage only — not orphaned, but a single
  point of failure if the homepage changes. `/plants/genus/` and
  `/supplies/category/` are largely redundant with what the
  always-present `CategorySidebar` already shows on every browsing page,
  so their marginal value is low; `/tags/` is more worth protecting
  since tags have no sidebar equivalent.

What's already working well (so this isn't just a problem list): click
depth to any product is shallow (1 click from homepage-featured, 2 via
Shop); tag pages are heavily linked (every product and every article/
blog post links its own tags); genus pages themselves are well-linked
via the sidebar, which appears on every browsing-layout page; and
articles/blog posts already cross-link to real products via
`mentionedProducts`, which is exactly the topical-relevance signal this
review was checking for.

**Item 5 — `Product` structured data, built and verified 2026-08-03.**
New `src/lib/productSchema.ts` exports `buildProductSchema()`, shared by
both `src/pages/plants/[slug].astro` and `src/pages/supplies/[slug].astro`.
Maps our `stockStatus` enum to Schema.org's `ItemAvailability` URIs
(`in-stock` → `InStock`, `low-stock` → `LimitedAvailability`, `sold-out`
→ `OutOfStock`, `pre-order` → `PreOrder`). Emits a plain `Offer` when all
of a product's variants share one price, or an `AggregateOffer` with
`lowPrice`/`highPrice`/`offerCount` when they differ — always includes
`brand: { "@type": "Brand", name: "Orchid Insanity" }`. Rendered as a
`<script type="application/ld+json">` tag, first thing inside
`BrowseLayout`'s slot on both page types.
Verified against real build output on all three shapes:
- Single-variant plant (Paphiopedilum division, $349.99) → plain `Offer`
  with `"price":349.99`.
- Multi-variant plant (Oncidium Sharry Baby) → `AggregateOffer` with
  `"lowPrice":24.99,"highPrice":44.99,"offerCount":2`.
- Multi-variant supply (Keiki Power Pro) → `AggregateOffer` with
  `"lowPrice":12.99,"highPrice":28.99,"offerCount":2`.
All three carry correct `name`, `description` (via `makeExcerpt`),
absolute `image` URLs, and absolute `url` (built against
`https://www.orchidinsanity.com`, same pattern as the OG tags — will
need the same `base` cleanup when that config is removed for production).

**Item 6 — `Article`/`BlogPosting` structured data, built and verified
2026-08-03.** New `src/lib/articleSchema.ts` exports `buildArticleSchema()`,
shared by `src/pages/articles/[slug].astro` (`"@type": "Article"`) and
`src/pages/blog/[slug].astro` (`"@type": "BlogPosting"`). No individual
byline exists on this site, so `author` and `publisher` are both set to
an `Organization` named `"Orchid Insanity"` (reusing `BUSINESS.name`,
same pattern as `brand` on the Product schema). Emits `headline`,
`description`, `datePublished` (ISO, from `publishDate`),
`mainEntityOfPage` (the page's own absolute URL), and `image` only when
`coverImage` is present — no fallback placeholder image, per explicit
decision; when a post/article has no cover, the `image` key is omitted
entirely rather than emitted as null/undefined (confirmed via a
throwaway no-coverImage test entry, built, checked, then deleted —
same disposable-test-content pattern used earlier for the reference-
union bug).
Verified against real build output:
- Article with cover image (`growing-dendrobium-kingianum`) → correct
  `Article` schema with absolute `image` URL.
- Blog post with cover image (`first-bloom-of-the-season`) → correct
  `BlogPosting` schema.
- Temporary no-`coverImage` article → `image` key absent entirely, rest
  of the schema intact.

**Known gap, flagged not blocking: no `publisher.logo`.** Google's
Article rich-result guidelines want the `publisher` Organization to
include a `logo` (a real image, above their minimum recommended size).
This site doesn't have a finished logo file yet — same category of
placeholder gap as the phone number in `businessInfo.ts`. Add
`logo: { "@type": "ImageObject", "url": ... }` to the `organization`
object in `articleSchema.ts` once a real logo image exists; until then,
the schema is valid, just not maximally rich-result-eligible.

**Item 7 — custom 404 page, built and verified 2026-08-03.** New
`src/pages/404.astro`: same `Layout`/`Navbar`/`Footer` shell as the rest
of the site, a plain "Page Not Found" message, and three ways back in —
Homepage, Shop, Search — using the same `btn-dark`/`btn-white` button
classes already used elsewhere (`productOverviewGrid.tsx`,
`shoppingCart.tsx`), not Bootstrap's generic `btn-outline-primary`, to
stay visually consistent with the rest of the site.
**One real finding worth flagging, not a bug:** the built file lands at
`dist/404.html` — the true root of the build output — while every other
page on the site is nested under `dist/astro-ecommerce/...` because of
the `base: '/astro-ecommerce'` config. This is Astro's normal, documented
behavior (the 404 page is always emitted to `<outDir>/404.html`
regardless of `base`, since that's the conventional path most static
hosts auto-detect for unmatched routes) — not something to fix. The
page's own internal links still correctly point at
`/astro-ecommerce/...` (verified in built output), since they're built
with `import.meta.env.BASE_URL` like every other link on the site. Just
worth remembering during the eventual `base` removal: once `base` goes
away, these links simplify to plain `/...` automatically, same as
everywhere else — no separate fix needed for this file specifically.

**All 7 SEO audit items are now done:** H1 fix, alt text fix, sitemap,
robots.txt, Product schema, Article/BlogPosting schema, custom 404 page.
Remaining open SEO-adjacent items: the internal-linking structural
review (flagged above, not yet started) and the `base` removal itself
before real deployment.

---

## 10. Tone/relationship notes for whichever Claude is reading this

- Owner is analytically engaged, enjoys understanding *why*, pushes back
  usefully. Treat them as a capable technical collaborator, not someone who
  needs hand-holding.
- Owner is new to git specifically (not to code in general) — explain git
  commands in plain terms when running them, rather than assuming
  familiarity.
- Don't build ahead of what's been reviewed. If in doubt, show findings and
  ask before writing more code: investigate → report findings honestly,
  including caveats/gaps → get a green light → proceed narrowly.
