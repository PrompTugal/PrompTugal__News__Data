// Serves events discovery (phase 1 evidence), claims and gaps (data.b@PrompTugal.dinis, 18 Nov 2026, at Dinis's word:
// PrompTugal__News__Website board/guidance/2026-11-18-events-in-two-phases.md). Reads discovery/ (in git).
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson } from './lib.mjs';

const ED = /—/g;   // the wording gate refuses em dashes in served files; a model's answer may hold them
const deDash = v => typeof v === 'string' ? v.replace(ED, ' - ') : Array.isArray(v) ? v.map(deDash) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deDash(x)])) : v;

export function buildDiscovery() {
  if (!existsSync('discovery/by-place')) return null;
  const answers = [];
  for (const place of readdirSync('discovery/by-place').sort()) for (const f of readdirSync(join('discovery/by-place', place)).filter(f => f.endsWith('.json')).sort()) {
    const d = readJson(join('discovery/by-place', place, f)); if (!d) continue;
    writeJson(`api/v1/discovery/by-place/${place}/${f}`, { ...deDash(d), served_note: 'Em dashes in the model\'s answer are shown as " - " here; the file in the repository keeps the answer as received.' });
    answers.push({ place, date: f.slice(0, 10), model: d.model, ok: d.ok, items: (d.items || []).length, citations: (d.citations || []).length, cost_usd: d.cost_usd || 0 });
  }
  const claims = [];
  const cdir = 'discovery/claims/by-place';
  if (existsSync(cdir)) for (const f of readdirSync(cdir).filter(f => f.endsWith('.json'))) { const d = readJson(join(cdir, f)); if (!d) continue; writeJson(`api/v1/events/claims/by-place/${f}`, deDash(d)); if (f !== 'index.json') claims.push(deDash(d)); }
  if (existsSync('discovery/claims/past')) for (const f of readdirSync('discovery/claims/past').filter(f => f.endsWith('.json'))) writeJson(`api/v1/events/past/${f}`, deDash(readJson(join('discovery/claims/past', f))));
  if (existsSync('discovery/youtube')) for (const f of readdirSync('discovery/youtube').filter(f => f.endsWith('.json'))) writeJson(`api/v1/discovery/youtube/${f}`, deDash(readJson(join('discovery/youtube', f))));   // YouTube listings via Perplexity (REQ-2026-0001)
  const gaps = readJson('discovery/gaps.json');
  if (gaps) writeJson('api/v1/sources/gaps.json', gaps);
  const spend = readJson('discovery/spend.json');
  writeJson('api/v1/discovery/index.json', { about: 'Events discovery, phase 1: one question a day per place to Perplexity (sonar) through OpenRouter, each answer kept with its model, time, prompt, cited URLs and cost. Evidence only, not content.', answers, spend });
  return { answers, claims, gaps, spend };
}
