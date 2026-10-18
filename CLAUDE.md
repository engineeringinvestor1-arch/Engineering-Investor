# Navodila za Claude

Preberi na začetku vsakega pogovora o strani. Kaj je kje, je v [README.md](README.md).

## Avtor in način dela

- Avtor strani Engineering Investor ni programer. Pogovor, datoteke in besedila so v slovenščini.
- Po vsakem koraku napiši: strokovni povzetek, "Preprosto povedano" in "Kaj potrebujem od tebe" (obvezno ločeno od neobveznega).
- Delaj po en korak naenkrat. Po koraku se ustavi in počakaj na potrditev.
- Kar ni jasno, vprašaj. Pri odločitvah, ki so avtorjeve (format, objava, plačljive storitve), ne ugibaj.

## Nepogajljivo

- **Nobena objava brez avtorja.** Zapis v vejo `main` na GitHubu stran objavi. Na `main` gre samo po avtorjevem izrecnem "objavi"; delo v pripravi ostane v ločeni veji in se ne pošilja.
- Repozitorij je javen: neobjavljen članek ali osnutek, ki ga pošlješ v katerokoli vejo, je javno viden.
- Ključev in gesel ne beri, ne izpisuj in ne vpisuj.
- Stari objavljeni članki se ne popravljajo.
- Dolgih pomišljajev ne uporabljaj nikjer.
- Nobena številka v članku ne izvira iz modela; vsaka ima vir.

## Pred objavo

1. `npm test`, `npm run test:prevodi`, `npm run build`.
2. Objavi iz čistega stanja `origin/main`, ne iz mape z neshranjenim delom.
3. Po objavi preveri stran na engineering-investor.com.

Remote mora v naslovu vsebovati `engineeringinvestor1-arch@github.com`, sicer GitHub zapis zavrne (na računalniku sta shranjena dva računa).

## Pravila kode

- Novo besedilo vmesnika gre v oba slovarja (`src/i18n/sl.ts`, `src/i18n/en.ts`), nikoli naravnost v predlogo.
- Račun brez vmesnika gre v `src/lib/` in dobi preizkus; komponenta ga samo prikaže.
- Najdena napaka dobi preizkus, preden se popravi.
- Vsak nov članek, tudi tedenski pregled, dobi angleški prevod in angleške grafe pred objavo (avtor 18. 10. 2026: prevod napiše Claude ob članku). Brez prevoda `npm run test:prevodi` pade (`scripts/i18n/clanki.test.mjs`); starejši članki samo v slovenščini so našteti v seznamu `SAMO_SLOVENSKO`, ki se ne daljša.
- Koda naj bere kot okoliška: ista imena, ista gostota komentarjev.

## Povezani repozitoriji

| Mapa | Kaj je |
|---|---|
| `engineering-investor-agent` | zasebni agent: zajem podatkov, zgodbe dneva, tedenski paket z osnutkom članka |
| `engineering-investor` | stara stran, od 10. 10. 2026 arhiv (`ARHIV.md` pove, kaj je vredno prenesti) |
