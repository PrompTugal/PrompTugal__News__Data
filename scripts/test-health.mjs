// Test (raw html blocks; text blocks are escaped by render.mjs inline()): the health sections of a source page escape every value and link only to https or a path on the site.
// Run: node scripts/test-health.mjs   (no network, writes nothing)   cl-6.data@PrompTugal.dinis, 28 Nov 2026, after cl-6.security's review
import { healthSections, healthTop, href } from './build/health.mjs';
let bad = 0;
const t = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { bad++; console.error(`FAIL ${what}: ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } else console.log('pass  ' + what); };
t('href keeps an https link', href('https://github.com/a/b/commit/c'), 'https://github.com/a/b/commit/c');
t('href keeps a path on this site', href('/api/v1/x/latest.json'), '/api/v1/x/latest.json');
t('href turns javascript: into #', href('javascript:alert(1)'), '#');
t('href turns data: into #', href('data:text/html,<script>1</script>'), '#');
t('href turns a protocol-relative link into #', href('//evil.example/x'), '#');
t('href turns http: into #', href('http://example.test/'), '#');
t('href turns nothing into #', [href(null), href(undefined), href('')], ['#', '#', '#']);
t('href escapes a quote', href('https://a.test/"><script>'), 'https://a.test/&quot;&gt;&lt;script&gt;');
const H = { source: 'x', title: 'T', generated_utc: '2026-11-28T01:00:00Z', source_home: 'javascript:alert(1)', schedule: { card_says: '<b>x</b>', really: '<i>y</i>' }, schedule_times: null,
  last_run: { at: '2026-11-28T00:00:00Z', ok: 1, failed: 1, requests: [{ name: '<img src=x onerror=1>', status: 200, bytes: 5, changed: true, meaning: '<script>alert(1)</script>' }] },
  problems: [{ request: 'r', url: 'javascript:alert(1)', status: [403], plain: '"><script>x</script>', failed_in: 'all' }],
  runs: [{ at: '2026-11-28T00:00:00Z', ok: 1, failed: 1, requests: 2, changed_requests: ['<b>'], failed_requests: ['r'], commit: 'abc', commit_url: 'javascript:alert(1)', compare_with_previous_run_url: 'data:text/html,<script>1</script>',
    requests_detail: [{ name: '<script>', status: 200, bytes: 1, sha256_prefix: '"x', changed: true }] }],
  copies: { files_in_git_data: 1, bytes_in_git_data: 10, files_in_vault_working_copy: 0, bytes_in_vault_working_copy: 0, dated_copies_in_vault: 0, where: { api_latest: 'javascript:1', api_reads: 'x', git: 'x' }, note: '<script>n</script>' },
  held: { items: 3, noun: '<b>n</b>', earliest: '2026-01-01', latest: '2026-01-02', date_field: 'd', per_day: [{ date: '2026-01-01', count: 2 }] }, cadence_advice: null, own_page_copy_note: '<script>o</script>' };
const html = [healthTop(H), ...healthSections(H)].filter(b => b.t === 'html').map(b => b.x).join('');
t('no script, img or b tag from a data value in the html', [/<script/i.test(html), /<img/i.test(html), /<b>n</i.test(html), /<i>y/i.test(html)], [false, false, false, false]);
t('no javascript: or data: href', [/href="javascript:/i.test(html), /href="data:/i.test(html)], [false, false]);
t('commit and compare links become #', (html.match(/href="#"/g) || []).length >= 3, true);
t('an https link opens in a new tab with noopener', /href="https:\/\/github\.com\/a\/b\/commit\/c"[^>]*target="_blank" rel="noopener"/.test(healthSections({ ...H, runs: [{ ...H.runs[0], commit_url: 'https://github.com/a/b/commit/c' }] }).filter(b => b.t === 'html').map(b => b.x).join('')), true);
if (bad) { console.error(`${bad} failed`); process.exit(1); }
console.log('OK (' + 12 + ' cases)');
