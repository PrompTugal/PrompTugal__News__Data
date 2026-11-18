// ENISA's publications list (title, date, link): the first page of https://www.enisa.europa.eu/publications, as served. Code, no model.
// Asked by cyber.b@PrompTugal.dinis (18 Nov 2026) inside Dinis's cyber signals. ENISA has no RSS or JSON feed for publications
// (checked 18 Nov 2026: /rss.xml, /publications/rss.xml, /publications/feed, /rss and /feeds/publications all 404; no feed link in the page);
// robots.txt allows this path to our agent (Crawl-delay 10, which the gap below respects). One GET a run. The page's text beyond
// each item's title, date, link and topic names is not kept. The bytes go to the vault copy (HTML).
const HOST = 'https://www.enisa.europa.eu', LIST = HOST + '/publications'
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('—')) { dropped++; return null } return t }
const ent = s => s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => +n < 0x110000 ? String.fromCodePoint(+n) : ' ')
// a link must be https on www.enisa.europa.eu under /publications/ (a relative path is made absolute); anything else is dropped
function link(h) {
    try { const u = new URL(h.trim(), HOST + '/'); return u.protocol === 'https:' && u.hostname === 'www.enisa.europa.eu' && !u.username && !u.password && !u.port && u.pathname.startsWith('/publications/') ? u.origin + u.pathname : null } catch { return null }
}

export default async function (run) {
    dropped = 0
    const r = await run.get('publications', LIST, { gap: 10000, tries: 2, headers: { accept: 'text/html' } })
    if (!r.ok) return null
    r.ext = 'html'
    const html = r.bytes.toString('utf8'), items = []
    for (const blk of html.split('<div class="publications-item">').slice(1)) {
        const h3 = /<h3>\s*<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/.exec(blk), t = /<time datetime="(\d{4}-\d{2}-\d{2})T[^"]*"/.exec(blk)
        if (!h3 || !t) continue
        const url = link(h3[1].replace(/&amp;/g, '&')), title = keep(ent(h3[2]), 200); if (!url || !title) continue
        const rel = /<div class="related-topics">([\s\S]*?)<a href="\/audience/.exec(blk)
        const topics = rel ? [...rel[1].matchAll(/<a href="\/topics\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map(m => keep(ent(m[1]), 80)).filter(Boolean).slice(0, 5) : []
        items.push({ title, date: t[1], url, topics })
    }
    if (!items.length) return null   // the page changed shape: the last read stays
    items.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    return {
        source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ page: LIST, robots: HOST + '/robots.txt (Crawl-delay 10; this path allowed)', feed: 'none: the HTML list is read' }),
        about: 'The newest publications on ENISA\'s publications page (title, date, link and the topics ENISA gives), as listed. The listing gives topics and audience, not a document type. Source: ENISA, www.enisa.europa.eu (legal notice 1.2: reproduction authorised if the source is acknowledged).',
        counts: { publications: items.length, newest: items[0].date, fields_dropped_em_dash: dropped, page_bytes: r.bytes.length },
        publications: items,
    }
}
