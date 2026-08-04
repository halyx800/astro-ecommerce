# Orchid Insanity

The source for [orchidinsanity.com](https://www.orchidinsanity.com) — live orchid plants, growing
supplies, and articles. Built with [Astro](https://astro.build), content managed as Markdown files
under `src/content/` (no database), cart handled client-side with
[nanostores](https://github.com/nanostores/nanostores).

See **[PROJECT_NOTES.md](./PROJECT_NOTES.md)** for the full architecture brief, decisions made and
why, and what's still open.

## Commands

All commands run from the project root, via **yarn** (not npm — see `PROJECT_NOTES.md` §7):

| Command             | Action                                       |
| :------------------ | :-------------------------------------------- |
| `yarn install`       | Install dependencies                          |
| `yarn dev`           | Start the local dev server                    |
| `yarn build`         | Build the production site to `./dist/`        |
| `yarn astro sync`    | Regenerate content collection types           |

## Project structure

```
/
├── public/                  # static assets served as-is
├── src/
│   ├── content/              # plants/, supplies/, articles/ — the actual catalog, as Markdown
│   ├── content.config.ts     # Zod schemas for the collections above
│   ├── components/           # Astro/React components
│   ├── layouts/
│   ├── lib/                  # cart store, search, slugify, etc.
│   └── pages/                 # file-based routing
├── PROJECT_NOTES.md
└── package.json
```

## Attribution

Visual design/styling forked from Creative Tim's MIT-licensed
["Astro Ecommerce"](https://github.com/creativetimofficial/astro-ecommerce) UI kit — see
`LICENSE.MD`. The data layer, cart, search, and all page logic have been fully replaced.
