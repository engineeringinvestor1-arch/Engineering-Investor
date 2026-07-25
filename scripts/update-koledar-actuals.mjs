#!/usr/bin/env node
/**
 * Daily job: finds koledar events from the last few days that don't yet have
 * an "actual" result recorded, asks Gemini (with Google Search grounding) to
 * research the real reported figures, and writes them back into
 * koledar-events.json.
 *
 * Uses GEMINI_API_KEY — the same free provider already used by the
 * engineering-investor daily-briefing bot, so the same key works here too
 * (or a new one is free and instant at https://aistudio.google.com/apikey).
 *
 * Safe by construction: this only ever fills in previously-empty `actual` /
 * `actualEps` fields on events whose date has already passed — it never
 * touches dates, titles, or forecasts, and every change lands in a normal git
 * commit that can be reviewed or reverted like any other.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/koledar-events.json');
const LOOKBACK_DAYS = 4; // covers weekends / a missed run without re-scanning ancient history
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function parseDateUTC(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function todayUTC() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing — skipping koledar actuals update.');
    process.exit(0); // don't fail the workflow over a missing optional secret
  }

  const raw = await readFile(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  const today = todayUTC();
  const cutoff = today - LOOKBACK_DAYS * 86_400_000;

  const inWindow = (dateStr) => {
    const t = parseDateUTC(dateStr);
    return t >= cutoff && t <= today;
  };

  const pendingMacro = data.macroEvents.filter((e) => inWindow(e.date) && !e.actual);
  const pendingEarnings = data.earnings.filter((e) => inWindow(e.date) && !e.actualEps);

  if (pendingMacro.length === 0 && pendingEarnings.length === 0) {
    console.log('Koledar: no recent events pending actual results. Nothing to do.');
    return;
  }

  console.log(`Koledar: researching ${pendingMacro.length} macro + ${pendingEarnings.length} earnings event(s)...`);

  const prompt = buildPrompt(pendingMacro, pendingEarnings);
  const result = await callGeminiWithSearch(apiKey, prompt);

  let parsed;
  try {
    parsed = extractJson(result);
  } catch (err) {
    console.error('Koledar: could not parse a JSON result from the model response. Raw response:');
    console.error(result);
    process.exit(1);
  }

  let changed = 0;

  for (const entry of parsed.macro ?? []) {
    if (!entry.actual) continue;
    const evt = data.macroEvents.find((e) => e.id === entry.id);
    if (evt && !evt.actual) {
      evt.actual = entry.actual;
      changed++;
      console.log(`  macro:    ${evt.id} -> ${entry.actual}`);
    }
  }

  for (const entry of parsed.earnings ?? []) {
    if (!entry.actualEps) continue;
    const evt = data.earnings.find((e) => e.id === entry.id);
    if (evt && !evt.actualEps) {
      evt.actualEps = entry.actualEps;
      if (entry.actualNote) evt.actualNote = entry.actualNote;
      changed++;
      console.log(`  earnings: ${evt.id} -> ${entry.actualEps}`);
    }
  }

  if (changed === 0) {
    console.log('Koledar: model found no verifiable actual results yet. Nothing to do.');
    return;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Koledar: updated ${changed} event(s).`);
}

function buildPrompt(macro, earnings) {
  const macroList = macro
    .map((e) => `- id: ${e.id} | naslov: ${e.title} | datum: ${e.date} | kategorija: ${e.category}`)
    .join('\n');
  const earningsList = earnings
    .map((e) => `- id: ${e.id} | podjetje: ${e.name} (${e.ticker}) | datum poročila: ${e.date}`)
    .join('\n');

  return `Raziskuješ resnične, preverjene finančne podatke za slovenski ekonomski koledar. Za vsak spodnji dogodek z Google iskanjem poišči DEJANSKI, že objavljeni rezultat (ne napovedi, ne pričakovanja).

Zelo pomembno: poroč samo o vrednostih, ki jih lahko potrdiš z iskanjem. Če za dogodek ne najdeš zanesljivega objavljenega rezultata (npr. se še ni zgodil ali podatka ni), pusti njegovo vrednost na null — ne izmišljuj si številk.

${macroList ? `Makro dogodki:\n${macroList}\n` : ''}
${earningsList ? `Zaslužki podjetij (Q2 2026):\n${earningsList}\n` : ''}

Za makro dogodke (centralna banka, CPI, PPI, NFP, PMI, GDP ipd.) poišči dejansko objavljeno vrednost/odločitev in jo na kratko opiši v slovenščini (npr. "Fed obdržal obrestno mero pri 3,50-3,75 %" ali "CPI 2,7 % letno, pod pričakovanji 2,9 %").

Za zaslužke podjetij poišči dejanski poročan EPS (dobiček na delnico) in kratko opombo o tem, ali je presegel ali zaostal za pričakovanji konsenza.

Odgovori SAMO z JSON objektom v natanko tej obliki, brez kakršnegakoli drugega besedila pred ali po njem:

{
  "macro": [{"id": "<id>", "actual": "<kratek opis v slovenščini ali null>"}],
  "earnings": [{"id": "<id>", "actualEps": "<npr. 2,10 USD (nad pričakovanji 1,95 USD) ali null>", "actualNote": "<kratka opomba ali null>"}]
}`;
}

async function callGeminiWithSearch(apiKey, prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8000 },
  };

  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${await res.text()}`);

      const json = await res.json();
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p) => p.text || '').join('\n').trim();
      if (!text) throw new Error('Empty Gemini output');
      return text;
    } catch (err) {
      console.warn(`[gemini] ${model} failed: ${err.message}`);
      lastErr = err;
    }
  }
  throw new Error(`All Gemini models failed. Last: ${lastErr?.message}`);
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '');
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

main().catch((err) => {
  console.error('Koledar update failed:', err);
  process.exit(1);
});
