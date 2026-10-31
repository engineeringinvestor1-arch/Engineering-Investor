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
- Viri so samo za urednika (avtor 31. 10. 2026). V datoteki članka ostanejo zapisani kot doslej (vrstice Viri, Številke, povezave pri drugih novicah, Vir v grafih); `src/plugins/remark-viri.mjs` jih pri gradnji odstrani, predogled `npm run dev` jih pokaže označene. `npm run build` pade, če kak vir ostane na strani (`scripts/clanki/preveri-vire.mjs`); nova oblika vira gre v vtičnik s preizkusom. Omembe v besedilu ("po poročanju Bloomberga") ostanejo.

## Pred objavo

1. `npm test`, `npm run test:prevodi`, `npm run build`.
2. Objavi iz čistega stanja `origin/main`, ne iz mape z neshranjenim delom.
3. Po objavi preveri stran na engineering-investor.com.

Tedenski pregled pred objavo prestane še preizkus slike tedna (avtor 24. 10. 2026): članek preberi kot bralec, ki o tednu ne ve ničesar, sliko primerjaj z dejanskim tednom iz izmerjenih podatkov in vseh zgodb ter avtorju povej, kje je napačen vtis in kaj manjka. Postopek je v `engineering-investor-agent/CLAUDE.md`.

Ob vsakem tedenskem pregledu se posodobi tudi koledar (avtor 31. 10. 2026), za naprej in za nazaj. Za naprej: dogodki in objave rezultatov naslednjih dveh tednov z uro, prejšnjo vrednostjo in pričakovanjem. Za nazaj: vsak dogodek in vsaka objava rezultatov preteklega tedna ima izid, uradno naslovno številko ob prvi objavi, preverjeno pri izdajatelju (BLS, BEA, Fed, ECB, sporočilo podjetja na SEC) in primerjano z investing.com. Kar robot ni vpisal, se vpiše ročno, vzrok pa se popravi. Vse samo iz brezplačnih virov, brez modela.

V koledar sodijo tudi politični dogodki z uradno razpisanim datumom, ki premaknejo trg, kategorija Politika (avtor 31. 10. 2026, ko vmesnih volitev v ZDA 3. 11. ni bilo v koledarju). Sobotni paket agenta opozori na dogodek, o katerem piše veliko virov, a ga v koledarju ni.

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
