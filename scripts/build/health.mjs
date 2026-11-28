// The health sections of a source page, built only from data/<id>/health.json (written by cl-6.data's wake): a badge, what is held,
// when it is collected, what is wrong, the last run request by request, the run history with commit and compare links, whether it
// needs calling more often, the requests across runs, and where it is kept. Design: cl-6.designer (data-source-pages, 28 Nov 2026).
// Nothing is explained here that the file does not explain. No script: the page is plain HTML and CSS.
import { readFileSync, existsSync } from 'node:fs';
import { h, p, raw, table } from './render.mjs';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = iso => { const t = new Date(iso); return isNaN(t) ? '-' : `${t.getUTCDate()} ${MON[t.getUTCMonth()]} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} UTC`; };
const bytes = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n || 0} B`;
// a link from a data value goes in an href only if it is https or a path on this site (cl-6.security, 28 Nov 2026): never javascript:, data: or //host
export const href = u => /^(https:\/\/|\/(?!\/))/.test(String(u || '')) ? esc(u) : '#';
const ok2 = q => q.status === 200 || q.status === 201 || (q.status === 404 && /robots/i.test(q.name));

export function loadHealth(id) {
  const f = `data/${id}/health.json`;
  if (!existsSync(f)) return null;
  try { const H = JSON.parse(readFileSync(f, 'utf8')); return H && H.last_run && Array.isArray(H.runs) ? H : null; } catch { return null; }
}
export const verdict = H => !H.problems.length ? ['Healthy', 'ok'] : H.last_run.ok === 0 ? ['Failing', 'bad'] : ['Partly failing', 'warn'];

/** The back link and the badge, shown above the page's first paragraph. */
export function healthTop(H) {
  const [word, cls] = verdict(H);
  return raw(`<p class="hl-back"><a href="/status/">&larr; All feeds (status)</a></p><p class="hl-badge hl-${cls}" role="status"><b>${esc(word)}</b></p>`, `[All feeds (status)](/status/). Status: ${word}.`);
}

function held(H) {
  const k = H.held; if (!k || k.items == null) return [];
  const pd = k.per_day || [], mx = Math.max(1, ...pd.map(x => x.count));
  const span = k.earliest ? `, ${k.earliest} to ${k.latest}` : '';
  const bars = pd.length ? `<div class="hl-hist" aria-label="Items per day">${pd.map(x => `<span title="${esc(x.date)}: ${x.count}"><i style="height:${Math.max(3, Math.round(x.count / mx * 100))}%"></i></span>`).join('')}</div><p class="hl-note">Items per day, oldest to newest (${pd.length} days).</p>` : '';
  return [h('The data held'), raw(`<p class="hl-big"><b>${k.items.toLocaleString('en-GB')}</b> ${esc(k.noun)} held${esc(span)}.</p>${bars}<p class="hl-note">Counted in <a href="${href(H.copies.where.api_latest)}">latest.json</a>${k.date_field ? ` by each item's <code>${esc(k.date_field)}</code>` : ', where the items carry no date'}.</p>`,
    `${k.items} ${k.noun} held${span}.`)];
}

function schedule(H) {
  const s = H.schedule, t = H.schedule_times, agree = (s.card_says === 'daily' && String(s.really).startsWith('once a day')) || (s.card_says === 'once' && String(s.really).startsWith('once')), mismatch = s.card_says !== s.really && !agree;
  return [h('When it is collected'),
    table(['Field', 'Value'], [['The card says', s.card_says], ['It really runs', `${s.really}${t ? ` (${t.times_local.join(' and ')} ${t.tz})` : ''}`], ['Last run', when(H.last_run.at)]], 'kv'),
    ...(mismatch ? [p(`**These disagree.** The card says "${s.card_says}"; the collector runs ${s.really}.`)] : [])];
}

function wrong(H) {
  const n = H.last_run.requests.length;
  if (!H.problems.length) {
    const notes = H.last_run.requests.filter(r => r.status >= 400);
    return [h('What is wrong'), p(`Nothing is wrong. ${H.last_run.ok} of ${n} requests were read normally.${notes.length ? ' ' + notes.map(r => `${r.name}: ${r.meaning}.`).join(' ') : ''}`)];
  }
  return [h('What is wrong'), p(`${H.problems.length} of ${n} requests are refused or failing. The rest are read normally.`),
    table(['Request', 'Status', 'What it means', 'Failed in', 'Address'], H.problems.map(x => [x.request, x.status.join(', '), x.plain, x.failed_in, `[${x.url.length > 70 ? x.url.slice(0, 70) + '...' : x.url}](${x.url})`]))];
}

function lastRun(H) {
  return [h('The last run, request by request'),
    table(['Request', 'Status', 'What it means', 'Size', 'Bytes'], H.last_run.requests.map(r => [r.name, String(r.status), r.meaning, bytes(r.bytes), r.changed === true ? 'changed' : r.changed === false ? 'same as before' : '-']))];
}

function runDetail(r) {
  const d = r.requests_detail; if (!d || !d.length) return '';
  return `<details><summary>The ${d.length} requests of this run</summary><ul class="hl-reqs">${d.map(q => `<li><code>${esc(q.name)}</code> <span class="hl-m">${esc(q.status)} &middot; ${bytes(q.bytes)}${q.sha256_prefix ? ' &middot; ' + esc(q.sha256_prefix) : ''} &middot; ${q.changed === true ? 'changed' : 'same'}</span></li>`).join('')}</ul></details>`;
}
function runLi(r) {
  const cmp = r.compare_with_previous_run_url ? ` &middot; <a href="${href(r.compare_with_previous_run_url)}" target="_blank" rel="noopener">what changed since the run before</a>` : ' &middot; oldest run kept, nothing to compare with';
  return `<li><div><b>${esc(when(r.at))}</b> &middot; ${r.ok} read, ${r.failed} failed &middot; ${r.changed_requests.length} changed</div><div class="hl-m">${r.commit_url ? `<a href="${href(r.commit_url)}" target="_blank" rel="noopener">commit ${esc(r.commit)}</a>` : 'no commit found'}${cmp}</div>${runDetail(r)}</li>`;
}
function history(H) {
  const runs = H.runs, changed = runs.filter(r => r.changed_requests.length).length;
  const strip = [...runs].reverse().map(r => `<span class="hl-c ${r.failed_requests.length ? 'hl-bad' : 'hl-ok'}" title="${esc(when(r.at))}">${r.failed_requests.length ? '&#9650;' : '&#9679;'}</span>`).join('');
  const first = runs.slice(0, 5).map(runLi).join(''), rest = runs.slice(5);
  return [h('Run history'),
    raw(`<div class="hl-strip" aria-label="Last ${runs.length} runs, oldest first">${strip}</div><p class="hl-note">Oldest to newest, last ${runs.length} runs kept. &#9679; all requests read &middot; &#9650; at least one request failed. ${changed} of ${runs.length} runs found something new. Times are the collection times: the collector runs at 07:03 and 18:03 Lisbon.</p><ul class="hl-runs">${first}</ul>${rest.length ? `<details><summary>Show the ${rest.length} older runs</summary><ul class="hl-runs">${rest.map(runLi).join('')}</ul></details>` : ''}`,
      `Last ${runs.length} runs, ${changed} found something new. Each run links to its commit and to what changed since the run before.`)];
}

function cadence(H) {
  const c = H.cadence_advice; if (!c) return [];
  return [h('Does it need calling more often?'), p(c.line), p(c.runs_kept ? `A suggestion from ${c.runs_kept} runs over ${c.days_covered} days; ${c.runs_with_change} found something new. ${c.basis}.` : c.basis)];
}

function matrix(H) {
  const rs = [...H.runs].reverse(); if (!rs.length || !rs.some(r => r.requests_detail)) return [];
  const names = (H.runs[0].requests_detail || []).map(q => q.name);
  const body = names.map(n => `<tr><th scope="row">${esc(n)}</th>${rs.map(r => { const q = (r.requests_detail || []).find(x => x.name === n); const c = !q ? '&middot;' : !ok2(q) ? '&#10005;' : q.changed === true ? '&#9670;' : '&#9675;'; return `<td${!q || ok2(q) ? '' : ' class="hl-x"'}>${c}</td>`; }).join('')}</tr>`).join('');
  return [h('Across runs'), raw(`<div class="scroll"><table class="hl-mx"><tbody>${body}</tbody></table></div><p class="hl-note">The last ${rs.length} runs, oldest to newest. &#9670; new bytes &middot; &#9675; same as the run before &middot; &#10005; refused or failed &middot; &middot; not requested.</p>`, `Requests across the last ${rs.length} runs: new bytes, same, refused, or not requested.`)];
}

function kept(H) {
  const c = H.copies, links = [];
  if (H.api_spec) links.push(`[API specification (OpenAPI)](${H.api_spec})`);
  if (H.api_docs) links.push(`[API documentation](${H.api_docs})`);
  links.push(`[The files in git](${c.where.git})`, `[API: latest](${c.where.api_latest})`, `[API: the request log](${c.where.api_reads})`, `[API: this health file](/api/v1/${H.source}/health.json)`, `[The source's own page](${H.source_home}) (not copied here)`);
  return [h('Where it is kept'),
    table(['Field', 'Value'], [['In git (data/)', `${c.files_in_git_data} files, ${bytes(c.bytes_in_git_data)}`], ['Vault working copy', `${c.files_in_vault_working_copy} files, ${bytes(c.bytes_in_vault_working_copy)}`], ['Dated copies in the vault', String(c.dated_copies_in_vault)], ['Tracked in git under vaults/', String(c.tracked_in_git_vaults ?? 0)]], 'kv'),
    p(c.note), p(H.own_page_copy_note || ''), { t: 'ul', items: links }];
}


/** A plain collapsible tree of the source's latest.json (details and summary, no script). Shortened: a node budget, the first five items of a list,
 *  values cut at 120 characters; the file has everything. Em dashes in values are shown as hyphens (the site writes none). */
function jsonTree(L, id) {
  let budget = 350;
  const cut = v => { const t = String(v).replace(/\u2014/g, '-'); return t.length > 120 ? t.slice(0, 120) + '...' : t; };
  const node = (k, v, depth) => {
    if (budget-- <= 0) return '';
    const key = `<code>${esc(k)}</code>`;
    if (v === null || typeof v !== 'object') return `<li>${key}: <span class="hl-v">${esc(cut(v))}</span></li>`;
    const arr = Array.isArray(v), all = arr ? v.length : Object.keys(v).length, keys = arr ? v.slice(0, 5).map((_, i) => i) : Object.keys(v).slice(0, 40);
    const label = `<span class="hl-m">${all} ${arr ? 'items' : 'fields'}</span>`;
    if (depth >= 4) return `<li>${key} ${label}, in the file</li>`;
    const kids = keys.map(i => node(arr ? `[${i}]` : i, v[i], depth + 1)).join('');
    const more = all > keys.length ? `<li class="hl-m">... ${all - keys.length} more, in the file</li>` : '';
    return `<li><details${depth === 0 ? ' open' : ''}><summary>${key} ${label}</summary><ul>${kids}${more}</ul></details></li>`;
  };
  return `<ul class="hl-tree">${node('latest.json', L, 0)}</ul>`;
}
function loadLatest(id) {
  const f = `data/${id}/latest.json`;
  try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { return null; }
}
function asJson(H) {
  const L = loadLatest(H.source); if (!L) return [];
  return [h('The data, as JSON'), raw(`${jsonTree(L, H.source)}<p class="hl-note">A shortened tree of <a href="${href(H.copies.where.api_latest)}">latest.json</a>: the first five items of each list, values cut at 120 characters. The file has everything.</p>`, `A shortened tree of [latest.json](${H.copies.where.api_latest}).`)];
}

/** The sections, in the designer's order, after the page's first paragraph. */
export function healthSections(H) {
  return [...held(H), ...schedule(H), ...wrong(H), ...lastRun(H), ...history(H), ...cadence(H), ...matrix(H), ...kept(H), ...asJson(H)].filter(b => !(b.t === 'p' && !b.x));
}
