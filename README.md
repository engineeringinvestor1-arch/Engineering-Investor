# Engineering Investor: stran

Koda strani [engineering-investor.com](https://engineering-investor.com). Javni repozitorij: vse, kar je tu, je vidno vsem.

Tedenske analize pripravlja agent v zasebnem repozitoriju `engineering-investor-agent`; sem pride samo članek, ki ga je avtor potrdil.

## Kaj je na strani

| Stran | Naslov | Koda |
|---|---|---|
| Domača | `/` | `src/pages/index.astro`, `src/components/home/` |
| Analize | `/analize`, `/analize/<ime>` | `src/pages/analize/`, članki v `src/content/analize/*.md` |
| Koledar | `/koledar` | `src/components/calendar/EkonomskiKoledar.astro`, podatki v `src/data/koledar-events.json` |
| Kalkulatorji | `/kalkulatorji`, `/investicijski-kalkulator`, `/kalkulator-vrednotenja` | `src/components/calculators/`, račun v `src/lib/` |
| Angleška različica | `/en/...` | `src/pages/en/`, slovarja v `src/i18n/`, prevodi člankov v `src/content/analize-en/` |

## Struktura

```
src/pages/          strani (slovenske na vrhu, angleške v en/)
src/components/     gradniki po področjih: articles, calculators, calendar, home, layout, ui
src/layouts/        ogrodje strani in članka
src/content/        članki: analize/ (slovenski izvirniki), analize-en/ (prevodi)
src/data/           podatki koledarja
src/i18n/           slovarja sl.ts in en.ts, naslovi strani, prevajalnik koledarja
src/lib/            računi brez vmesnika (kalkulatorja, zapis števil, tedni koledarja)
src/plugins/        obdelava člankov: vstavljanje grafov .svg, nelomljive vrednosti v preglednicah
src/styles/         skupni slog
public/images/articles/<ime članka>/   grafi članka
scripts/            robot za koledar in preizkusi (clanki/, i18n/, koledar/)
```

## Ukazi

```
npm install            samo prvič
npm run dev            lokalni predogled (naslov izpiše terminal)
npm test               preizkusi koledarja in člankov
npm run test:prevodi   preizkusi slovarjev, prevoda koledarja in zapisa števil
npm run build          zgradi stran v dist/
```

## Kako dodati novo analizo

Ustvari novo `.md` datoteko v `src/content/analize/` (ime datoteke = URL, brez šumnikov in presledkov):

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

Grafi `.svg` iz `public/images/articles/` se vstavijo naravnost v stran, da sledijo svetli in temni temi.

## Jeziki

Prvotni jezik je slovenščina na dosedanjih naslovih (`/analize`, `/koledar` ...). Angleška različica je na `/en/...` (`/en/analysis`, `/en/calendar`, `/en/calculators`). Gumb SL | EN v glavi vodi na isto stran v drugem jeziku.

- **Besedila vmesnika** so v slovarjih `src/i18n/sl.ts` (izvirnik) in `src/i18n/en.ts` z enakimi ključi. Novo besedilo dodaj v oba.
- **Članki**: izvirnik je v `src/content/analize/`, angleški prevod v `src/content/analize-en/`. Ime angleške datoteke je njen naslov strani, polje `izvirnik` v glavi pa ime slovenske datoteke brez končnice. Članek brez prevoda je viden samo v slovenščini; gumb EN na njem vodi na angleški seznam analiz.
- **Grafi** v angleškem članku so ločene datoteke `.svg` z angleškim besedilom v svoji mapi pod `public/images/articles/`.
- **Koledar** ima ene podatke za vse jezike (`src/data/koledar-events.json`, v slovenščini). Vrednosti prevede `src/i18n/koledar.ts`: robotove predloge po vzorcih, ročno napisane opombe po seznamu `NATANCNO_EN`. Nova ročna opomba potrebuje nov vnos v tem seznamu.
- **Kalkulatorja** vzameta besedila iz slovarja, zapis števil pa iz `src/lib/stevilke.ts` (slovensko `1.234,50 €`, angleško `€1,234.50`).

Nov jezik: nov slovar v `src/i18n/`, vnos v `LOCALES` in `POTI` (`src/i18n/index.ts`), mapa strani `src/pages/<jezik>/` po zgledu `src/pages/en/`, mapa prevodov člankov in pravila za koledar.

## Objava

Vsak zapis v vejo `main` na GitHubu stran zgradi in objavi (`.github/workflows/deploy.yml`). Zato:

- na `main` gre samo, kar je avtor potrdil z besedo "objavi";
- delo v pripravi živi v ločeni veji in se ne pošilja, dokler ni potrjeno;
- pred objavo: `npm test`, `npm run test:prevodi`, `npm run build`.

Sam objavlja samo robot za koledar (`.github/workflows/update-koledar.yml`, vsak dan): v `src/data/koledar-events.json` vpiše objavljene izide in pričakovanja.
