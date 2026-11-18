// /preview.svg: this site today in a few of its own live numbers, for the sites bar's pop-up (Dinis, 18 Nov 2026 ~22:00 UTC,
// PrompTugal__News__Website board/guidance/2026-11-18-the-sites-bar.md). /preview.png is made from it in the workflow, where a
// converter exists. Every number is counted from this build's own files, named in the SVG's metadata. data.b@PrompTugal.dinis.
import { writeJson, write } from './lib.mjs';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = v => Number.isFinite(v) ? v.toLocaleString('en-GB') : 'not read';

export function buildPreview({ sources, builtAt }) {
  const L = id => (sources.find(s => s.id === id) || {}).latest || null;
  const cams = L('cams'), nvd = L('nvd-cve'), kev = L('cisa-kev'), base = L('base-gov-pt'), gh = L('github-pt');
  const read = sources.filter(s => s.latest && s.latest.read_at).length;
  const figures = [
    { label: 'sources read', value: read, of: `of ${sources.length}`, from: '/api/v1/index.json' },
    { label: 'public contracts, 90 days', value: base && base.counts ? base.counts.contracts : NaN, of: base && base.counts ? `${base.counts.places} places` : '', from: '/api/v1/base-gov-pt/latest.json' },
    { label: 'public cameras', value: cams && cams.counts ? cams.counts.cameras : NaN, of: cams && cams.counts ? `${cams.counts.up} of ${cams.counts.cameras - (cams.counts.not_checked || 0)} checked are up` : '', from: '/api/v1/cams/latest.json' },
    { label: 'new CVEs, 24 hours', value: nvd && nvd.counts ? nvd.counts.new_last_24h : NaN, of: kev && kev.counts ? `${n(kev.counts.vulnerabilities)} exploited (CISA)` : '', from: '/api/v1/nvd-cve/latest.json' },
    { label: 'Portuguese code repositories', value: gh && gh.counts ? gh.counts.repos : NaN, of: gh && gh.counts ? `${gh.counts.orgs} organisations` : '', from: '/api/v1/github-pt/latest.json' },
  ];
  const W = 1200, H = 630, at = builtAt.slice(0, 16).replace('T', ' ') + ' UTC';
  const cell = (f, i) => { const col = i % 3, row = Math.floor(i / 3), x = 60 + col * 370, y = 200 + row * 190;
    return `<g transform="translate(${x},${y})"><text class="${Number.isFinite(f.value) ? 'v' : 'v nr'}" y="70">${esc(n(f.value))}</text><text class="l" y="110">${esc(f.label)}</text><text class="o" y="140">${esc(f.of)}</text></g>`; };
  const prov = { about: 'data.promptugal.news today, counted from this build\'s own files', built_at: builtAt, by: 'scripts/build/preview.mjs (code, no model; data.b@PrompTugal.dinis)', license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', holder: 'PrompTugal.news' }, figures: figures.map(f => ({ label: f.label, value: Number.isFinite(f.value) ? f.value : null, from: 'https://data.promptugal.news' + f.from })) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">data.promptugal.news today</title>
<desc id="d">${esc(figures.map(f => `${f.label}: ${n(f.value)}`).join('; '))}. Built ${esc(at)}. CC BY 4.0.</desc>
<metadata>${esc(JSON.stringify(prov))}</metadata>
<style>text{font-family:Georgia,'Times New Roman',serif;fill:#1d1d1b}.h{font-size:54px;font-weight:700}.s{font-size:26px;fill:#5b5b57}.v{font-size:68px;font-weight:700;fill:#1f6f43}.nr{font-size:40px;fill:#5b5b57}.l{font-size:26px}.o{font-size:22px;fill:#5b5b57}.f{font-size:20px;fill:#5b5b57}</style>
<rect width="${W}" height="${H}" fill="#f6f3ec"/><rect width="${W}" height="10" fill="#1f6f43"/>
<text class="h" x="60" y="105">data.promptugal.news</text>
<text class="s" x="60" y="150">Open data for Portugal, London and Europe, each value with its source and the time read</text>
${figures.map(cell).join('\n')}
<text class="f" x="60" y="${H - 30}">Built ${esc(at)} from this site's own files. Licence: CC BY 4.0; each source keeps its own terms.</text>
</svg>
`;
  write('preview.svg', svg);
  writeJson('preview.json', prov);
  return figures.length;
}
