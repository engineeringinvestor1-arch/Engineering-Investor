# Engineering Investor — glavna stran

To je **prava/glavna** stran (za bodočo domeno). Vizualno je enaka kot `engineering-investor` (staro razvojno okolje za preizkušanje), a vsebuje samo:

- **Domača stran** (`/`)
- **Analize** (`/analize` — seznam, `/analize/[slug]` — posamezna analiza)

Brez prijave, premium vsebin, kalkulatorjev ali drugih strani — te ostanejo v `engineering-investor` za preizkušanje, dokler niso pripravljene za objavo tukaj.

## Zagon lokalno

```
npm install
npm run dev
```

Odpri naslov, ki ga izpiše terminal (privzeto `http://localhost:4321`).

## Kako dodati novo analizo

Ustvari novo `.md` datoteko v `src/content/analize/` (ime datoteke = URL, brez šumnikov/presledkov):

```markdown
---
title: "Naslov analize"
description: "1-2 stavka povzetka."
pubDate: 2026-07-20
category: "Makro"
readingTime: 5
featured: false
---

## Podnaslov

Vsebina v Markdownu.
```

Kategorije: `Makro`, `Geopolitika`, `Trgi`, `Bitcoin`, `Delnice`. `featured: true` prikaže analizo na domači strani.

Primer/predloga: `src/content/analize/dobrodosli.md` — uredi ali izbriši.

## Deployment

Domena in gostovanje še nista izbrana. Ko bo domena kupljena, se doda `site` v `astro.config.mjs` in ustrezen deploy workflow (npr. GitHub Actions, Vercel, Netlify).
