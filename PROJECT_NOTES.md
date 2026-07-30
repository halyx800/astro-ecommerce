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
  - Deployment target — needs a host with serverless function support for
    the Stripe Checkout session creation (Vercel/Netlify/Cloudflare are the
    natural candidates over pure static hosting). Not chosen yet.
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

- **`plants`** — genus, species, isHybrid, hybridName, cultivarName,
  commonName, displayName, type (`clone`/`division`/`seedling`/`mystery`),
  rarity, `variants[]` (label/price/stockStatus/optional
  quantityAvailable), top-level `stockStatus`, `tags[]`, `images[]`,
  featured, publishDate.
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
6. Build real cart state (client-side store, e.g. nanostores) and wire the
   Checkout button to a Stripe Checkout Session (small serverless function —
   deployment target/adapter still to be chosen). See §3's inventory
   concurrency note — needs deciding alongside hosting.
7. Decide + implement: guest-only checkout vs. accounts; final social media
   approach; logo integration; sourcing real product photography (frontmatter
   image paths are currently placeholders, no actual image files yet).

**Recommended products (raised 2026-07-30):** owner wants this to be a
**hand-curated mapping**, not an algorithm — e.g. "Dendrobium kingianum
buyers frequently also like Cattleya aurantiaca" is domain knowledge only
the owner has, not something derivable from tags/genus alone. Likely
implementation: a small hand-edited file (per-listing list of related
slugs, or a simple lookup table) rather than any "similar items" logic.
Not built yet — the current product-page work only stubs a placeholder
where this will go.

**Reviews (raised 2026-07-30):** deferred, no data source or design yet.
One thing flagged for later: real reviews normally come from customers
submitting whenever they want, which doesn't fit the flat-file
rebuild-on-push model any better than live inventory changes do (same
tension as the inventory concurrency note in §3) — unless the owner is
the one hand-entering reviews (copy a review in, commit, rebuild), which
would fit this architecture cleanly and mirrors the hand-curated
recommended-products approach above. Live customer-submitted reviews
would need a real discussion (probably a live backend endpoint) when/if
that's wanted.

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
