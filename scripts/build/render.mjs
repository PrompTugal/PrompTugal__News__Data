// A tiny block model rendered twice: to HTML and to the markdown twin.
// Inline syntax in text: [label](url), `code`, **bold**.
import { existsSync } from 'node:fs';
import { SITE, REPO, ACCOUNT, write } from './lib.mjs';
// the charts (src/assets/viz/, data.b.design@): linked only once all three files exist, so a build without them still passes the gate
const VIZ = ['viz.css', 'wind.js', 'viz.js'].every(f => existsSync(`src/assets/viz/${f}`)) ? '<link rel="stylesheet" href="/assets/viz/viz.css">\n<script src="/assets/viz/wind.js" defer></script>\n<script src="/assets/viz/viz.js" defer></script>\n' : '';
const LABS = ['storm-labs.css', 'storm-labs.js'].every(f => existsSync(`src/assets/viz/${f}`)) ? '<link rel="stylesheet" href="/assets/viz/storm-labs.css">\n<script src="/assets/viz/storm-labs.js" defer></script>\n' : '';
const FLIGHTMAP = ['flightmap.css', 'flightmap.js'].every(f => existsSync(`src/assets/viz/${f}`)) ? '<link rel="stylesheet" href="/assets/viz/flightmap.css">\n<script src="/assets/viz/flightmap.js" defer></script>\n' : '';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const inline = s => esc(s)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export const h = (x, l = 2) => ({ t: 'h', l, x });
export const p = x => ({ t: 'p', x });
export const ul = items => ({ t: 'ul', items });
export const table = (head, rows, cls = '') => ({ t: 'table', head, rows, cls });
export const pre = x => ({ t: 'pre', x });
export const raw = (x, md = '') => ({ t: 'html', x, md });
export const quote = (x, lang, cite) => ({ t: 'quote', x, lang, cite });

function toHtml(b) {
  switch (b.t) {
    case 'h': return `<h${b.l} id="${slug(b.x)}">${inline(b.x)}</h${b.l}>`;
    case 'p': return `<p>${inline(b.x)}</p>`;
    case 'ul': return `<ul>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
    case 'html': return b.x;
    case 'pre': return `<pre><code>${esc(b.x)}</code></pre>`;
    case 'quote': return `<blockquote${b.lang ? ` lang="${esc(b.lang)}"` : ''}><p>${esc(b.x)}</p>${b.cite ? `<footer>${inline(b.cite)}</footer>` : ''}</blockquote>`;
    case 'table': return `<div class="scroll"><table class="${b.cls}"><thead><tr>${b.head.map(c => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
}
function toMd(b) {
  switch (b.t) {
    case 'h': return `${'#'.repeat(b.l)} ${b.x}`;
    case 'p': return b.x;
    case 'ul': return b.items.map(i => `- ${i}`).join('\n');
    case 'html': return b.md;
    case 'pre': return '```\n' + b.x + '\n```';
    case 'quote': return b.x.split('\n').map(l => `> ${l}`).join('\n') + (b.cite ? `\n>\n> ${b.cite}` : '');
    case 'table': return `| ${b.head.map(cell).join(' | ')} |\n|${b.head.map(() => '---').join('|')}|\n` + b.rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n');
  }
}

// the sites rail, as on promptugal.news (PrompTugal__News__Website assets/top/top.tmpl, .em-net)
const SITES = [['https://weather.promptugal.news/', 'Weather'], ['https://civic.promptugal.news/', 'Civic'], ['https://startups.promptugal.news/', 'Startups'], ['https://travel.promptugal.news/', 'Travel'], ['https://data.promptugal.news/', 'Data']];
const NAV = [['/sources/', 'Sources'], ...(existsSync('data/events/by-place/index.json') ? [['/events/', 'Events']] : []), ['/storm/', 'Storm'], ['/api/', 'API'], ['/api/swagger/', 'Explorer'], ['/vaults/', 'Vaults'], ['/how/', 'How'], ['/about/', 'About']];

// path: 'sources/ipma-uv/' (directory, with trailing slash) or '' for the front page
export function page({ path, title, description, h1, blocks, readAt, head = '', foot = '', skipH1 = false }) {
  const url = '/' + path;
  const twin = `${url}index.md`;
  const stamp = readAt ? `data read ${readAt.replace('T', ' ').replace(/:\d\dZ$/, ' UTC')}` : 'data not read yet';
  const body = blocks.map(toHtml).join('\n');
  const hasMap = body.includes('data-viz="storm-flightmap"');
  const hasLabs = /data-viz="storm-(hours|stations|models)"/.test(body);
  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/brand/brand-tokens.css">
<link rel="stylesheet" href="/assets/site.css">
<link rel="alternate" type="text/markdown" href="${twin}">
<script src="/assets/top/top.js" defer></script>
<script src="/assets/obs/obs.js" defer></script>
${VIZ}${hasMap ? FLIGHTMAP : ''}${hasLabs ? LABS : ''}${head}</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header class="mast">
<div class="mast-in">
<a class="brand" href="/"><picture><source srcset="/assets/brand/promptugal-wordmark-dark.svg" media="(prefers-color-scheme: dark)"><img src="/assets/brand/promptugal-wordmark-light.svg" alt="PrompTugal.news" width="200" height="33"></picture><span class="brand-data">· Data</span></a>
<nav aria-label="Main">${NAV.map(([u, l]) => `<a href="${u}"${url.startsWith(u) && (u !== '/api/' || !url.startsWith('/api/swagger')) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
</div>
<div class="mast-meta"><span class="ver">Version __VERSION__</span><span>${esc(stamp)}</span><a class="pay-chip" href="/account/" title="Pay for what you read. Pages built on IPMA data are free here, outside the meter, until Dinis decides; the reading account is at ${ACCOUNT}">Pay for what you read · <b id="pay-balance">free here</b></a></div>
</header>
<nav class="em-net" aria-label="The PrompTugal.news sites"><span>Also from PrompTugal.news</span>${SITES.map(([u, l]) => `<a href="${u}"${l === 'Data' ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<main id="main">
${skipH1 ? '' : `<h1>${esc(h1 || title)}</h1>\n`}${body}
</main>
<footer class="foot">
<p>Not a warning service: follow <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>. Each value keeps its source and the time it was read.</p>
<p>Licences: what PrompTugal.news makes (these pages, our records, the visualisations) is <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; every value from a source stays under that source's licence or terms, linked on its source page and in every JSON file (<code>license</code>).</p>
<p>Free to read: pages built on IPMA data stay outside the reading meter until Dinis decides. Your reading account: <a href="${ACCOUNT}">promptugal.news/account/</a>; on this site: <a href="/account/">your reading graph</a>.</p>
<p class="foot-obs">Code Apache-2.0. Text CC BY 4.0. Data: each source's own terms (see its card). <a href="${REPO}">Repository</a> · <a href="${twin}">Markdown version of this page</a> · <a href="/llms.txt">llms.txt</a></p>
</footer>
${foot}</body>
</html>
`;
  write(`${path}index.html`, html);
  write(`${path}index.md`, `# ${h1 || title}\n\n` + blocks.map(toMd).join('\n\n') + `\n\n---\n\nVersion __VERSION__ · ${stamp} · Code Apache-2.0; our pages, records and visualisations CC BY 4.0; each source's data under its own licence or terms, linked · [Repository](${REPO}) · [Pay for what you read](${ACCOUNT}) · ${SITE}${url}\n`);
  return url;
}
