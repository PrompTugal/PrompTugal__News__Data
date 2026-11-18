// The attribution ledger: per source, how often its work appears, is cited and is linked on this site
// (data.b@PrompTugal.dinis, 18 Nov 2026, at Dinis's word: PrompTugal__News__Website
// board/guidance/2026-11-18-people-blogs-cyber-and-simulated-payments.md). Input for dev@'s SIMULATED payouts on
// promptugal.news/payments/simulated/: no payment is made or collected; no money moves. Counted from the source and
// evidence fields every item already carries; "followed" (clicks) is not counted here: page views are anonymous and
// drained by conductor.b@, not joined to links.
import { readJson, writeJson } from './lib.mjs';

const host = u => { try { return new URL(String(u).split(' ')[0]).hostname.replace(/^www\./, ''); } catch { return null; } };

export function buildAttribution({ sources, events, discovery }) {
  const L = new Map();
  const row = (key, o) => { if (!key) return null; const r = L.get(key) || { source: key, name: o.name || key, kind: o.kind || null, appearances: 0, citations: 0, links: 0, data_files: 0, as: new Set() }; L.set(key, r); return r; };
  // data sets read by a collector: each value served is an appearance of that publisher's data
  for (const s of sources) {
    if (s.id === 'events-pt' || s.id === 'social') continue;   // counted per host below
    const r = row(host(s.card.source_home), { name: s.card.publisher.split(',')[0], kind: 'data provider' });
    const l = s.latest || {};
    const n = Object.values(l).filter(Array.isArray).reduce((m, a) => m + a.length, 0);
    r.appearances += n; r.data_files += 1; r.links += 1; r.as.add('data set');
  }
  // events read from agendas: one appearance and one link per event
  for (const p of events.filter(p => p.id !== 'algarve')) for (const e of (p.data.events || []))   // not the Algarve roll-up, which repeats its towns
    { const r = row(host(e.url), { kind: 'agenda' }); if (!r) continue; r.appearances++; r.links++; r.as.add('event listing'); }
  // claims: each evidence link is a citation of that host (discovery evidence)
  for (const c of ((discovery && discovery.claims) || []).filter(c => c.place !== 'algarve')) for (const cl of (c.claims || [])) for (const ev of (cl.evidence || [])) { const r = row(ev.host, { kind: ev.readable ? 'readable source' : 'cited, not read' }); if (!r) continue; r.citations++; r.links++; r.as.add('discovery evidence'); }
  // social posts: one appearance and one link per post, credited to the organisation that posted
  const soc = readJson('data/social/latest.json');
  for (const p of ((soc && soc.posts) || [])) { const r = row(`${p.platform}:${p.account}`, { name: p.organisation, kind: 'social account' }); r.appearances++; r.links++; r.as.add('post link'); }
  const rows = [...L.values()].map(r => ({ ...r, as: [...r.as].sort(), weight: r.appearances + 2 * r.citations })).sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source));
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  for (const r of rows) r.share = Math.round(10000 * r.weight / total) / 10000;
  writeJson('api/v1/sources/attribution.json', {
    simulated: 'Simulated. No payment is made or collected; no money moves.',
    about: 'Per source, how often its work appears (values, events, posts), is cited (evidence links for events found through discovery) and is linked on data.promptugal.news, as of this build. Input for the simulated payout model on promptugal.news/payments/simulated/ (dev@). weight = appearances + 2 x citations, an assumption for Dinis to change; share = weight over the total. Clicks are not counted (page views are anonymous and not joined to links).',
    assumptions: { weight: 'appearances + 2 x citations', followed: 'not counted', scope: 'data.promptugal.news only' },
    counts: { sources: rows.length },
    sources: rows,
  });
  return rows;
}
