#!/usr/bin/env node
/**
 * Daily job: finds koledar events from the last few days that don't yet have
 * an "actual" result recorded, and fills them in from official free data
 * sources — no AI, no web search, no hallucination risk:
 *
 *   - FRED (Federal Reserve Economic Data, stlouisfed.org) for US macro
 *     releases: CPI, PPI, NFP, retail sales, GDP, Fed funds rate.
 *   - Finnhub for actual reported EPS on the earnings calendar.
 *
 * EU events (ECB, EU CPI/PMI) and ISM PMI aren't on either free source, so
 * they're left for manual entry — the UI already handles a missing `actual`
 * gracefully.
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

function parseDateUTC(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function todayUTC() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function fmtNum(v, decimals = 1) {
  return v.toLocaleString('sl-SI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ------------------------------------------------------------------ */
/* FRED (US macro actuals)                                             */
/* ------------------------------------------------------------------ */

async function fredLatest(apiKey, seriesId, units) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1${units ? `&units=${units}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const obs = json.observations?.[0];
  if (!obs || obs.value === '.') return null;
  return { value: Number(obs.value), date: obs.date };
}

async function fetchMacroActual(apiKey, evt) {
  if (evt.region !== 'US') return null; // no free EU source configured
  const t = evt.title;

  if (evt.category === 'Centralna banka') {
    const [lower, upper] = await Promise.all([
      fredLatest(apiKey, 'DFEDTARL'),
      fredLatest(apiKey, 'DFEDTARU'),
    ]);
    if (!lower || !upper) return null;
    return `Fed obrestna mera: ${fmtNum(lower.value, 2)}-${fmtNum(upper.value, 2)} %`;
  }

  if (evt.category === 'Inflacija') {
    const series = t.includes('PPI') ? 'PPIACO' : 'CPIAUCSL';
    const obs = await fredLatest(apiKey, series, 'pc1');
    if (!obs) return null;
    return `${t.includes('PPI') ? 'PPI' : 'CPI'} ${fmtNum(obs.value)} % letno`;
  }

  if (evt.category === 'Trg dela' && t.includes('NFP')) {
    const obs = await fredLatest(apiKey, 'PAYEMS', 'chg');
    if (!obs) return null;
    const jobs = Math.round(obs.value * 1000);
    return `${jobs >= 0 ? '+' : ''}${jobs.toLocaleString('sl-SI')} novih delovnih mest`;
  }

  if (evt.category === 'GDP') {
    const obs = await fredLatest(apiKey, 'A191RL1Q225SBEA');
    if (!obs) return null;
    return `${fmtNum(obs.value)} % (anualizirano)`;
  }

  if (evt.category === 'Poraba') {
    const obs = await fredLatest(apiKey, 'RSAFS', 'pch');
    if (!obs) return null;
    return `${fmtNum(obs.value)} % mesečno`;
  }

  return null; // PMI (ISM) has no free FRED series
}

/* ------------------------------------------------------------------ */
/* Finnhub (earnings actuals)                                          */
/* ------------------------------------------------------------------ */

async function fetchEarningsActual(apiKey, evt, cutoffDate) {
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${evt.ticker}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${evt.ticker} ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const match = rows.find((r) => r.actual !== null && r.period && parseDateUTC(r.period) >= cutoffDate);
  if (!match) return null;

  const actual = match.actual;
  const estimate = match.estimate;
  let note = null;
  if (typeof estimate === 'number') {
    const diff = actual - estimate;
    note = diff >= 0
      ? `presegel pričakovanja (ocena ${fmtNum(estimate, 2)} USD)`
      : `zaostal za pričakovanji (ocena ${fmtNum(estimate, 2)} USD)`;
  }

  return { actualEps: `${fmtNum(actual, 2)} USD`, actualNote: note };
}

/* ------------------------------------------------------------------ */

async function main() {
  const fredKey = process.env.FRED_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!fredKey && !finnhubKey) {
    console.error('FRED_API_KEY and FINNHUB_API_KEY both missing — skipping koledar actuals update.');
    process.exit(0); // don't fail the workflow over missing optional secrets
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

  let changed = 0;

  if (fredKey) {
    for (const evt of pendingMacro) {
      try {
        const actual = await fetchMacroActual(fredKey, evt);
        if (actual) {
          evt.actual = actual;
          changed++;
          console.log(`  macro:    ${evt.id} -> ${actual}`);
        }
      } catch (err) {
        console.warn(`  macro:    ${evt.id} failed: ${err.message}`);
      }
    }
  } else {
    console.log('FRED_API_KEY missing — skipping macro events.');
  }

  if (finnhubKey) {
    for (const evt of pendingEarnings) {
      try {
        const result = await fetchEarningsActual(finnhubKey, evt, cutoff);
        if (result) {
          evt.actualEps = result.actualEps;
          if (result.actualNote) evt.actualNote = result.actualNote;
          changed++;
          console.log(`  earnings: ${evt.id} -> ${result.actualEps} (${result.actualNote ?? 'ni ocene'})`);
        }
      } catch (err) {
        console.warn(`  earnings: ${evt.id} failed: ${err.message}`);
      }
    }
  } else {
    console.log('FINNHUB_API_KEY missing — skipping earnings events.');
  }

  if (changed === 0) {
    console.log('Koledar: no verifiable actual results available yet. Nothing to do.');
    return;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Koledar: updated ${changed} event(s).`);
}

main().catch((err) => {
  console.error('Koledar update failed:', err);
  process.exit(1);
});
