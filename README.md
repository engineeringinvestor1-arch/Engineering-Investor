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

## Jeziki

Prvotni jezik je slovenščina na dosedanjih naslovih (`/analize`, `/koledar` ...). Angleška različica je na `/en/...` (`/en/analysis`, `/en/calendar`, `/en/calculators`). Gumb SL | EN v glavi vodi na isto stran v drugem jeziku.

- **Besedila vmesnika** so v slovarjih `src/i18n/sl.ts` (izvirnik) in `src/i18n/en.ts` z enakimi ključi. Novo besedilo dodaj v oba.
- **Članki**: izvirnik je v `src/content/analize/`, angleški prevod v `src/content/analize-en/`. Ime angleške datoteke je njen naslov strani, polje `izvirnik` v glavi pa ime slovenske datoteke brez končnice. Članek brez prevoda je viden samo v slovenščini; gumb EN na njem vodi na angleški seznam analiz.
- **Grafi** v angleškem članku so ločene datoteke `.svg` z angleškim besedilom v svoji mapi pod `public/images/articles/`.
- **Koledar** ima ene podatke za vse jezike (`src/data/koledar-events.json`, v slovenščini). Vrednosti prevede `src/i18n/koledar.ts`: robotove predloge po vzorcih, ročno napisane opombe po seznamu `NATANCNO_EN`. Nova ročna opomba potrebuje nov vnos v tem seznamu.
- **Kalkulatorja** vzameta besedila iz slovarja, zapis števil pa iz `src/lib/stevilke.ts` (slovensko `1.234,50 €`, angleško `€1,234.50`).

Pred objavo poženi `npm run test:prevodi`: preveri, da imata slovarja iste ključe, da v koledarju ni vrednosti, ki bi v angleščini ostala slovenska, in da je zapis števil v obeh jezikih pravilen.

Nov jezik: nov slovar v `src/i18n/`, vnos v `LOCALES` in `POTI` (`src/i18n/index.ts`), mapa strani `src/pages/<jezik>/` po zgledu `src/pages/en/`, mapa prevodov člankov in pravila za koledar.

## Deployment

Domena in gostovanje še nista izbrana. Ko bo domena kupljena, se doda `site` v `astro.config.mjs` in ustrezen deploy workflow (npr. GitHub Actions, Vercel, Netlify).
