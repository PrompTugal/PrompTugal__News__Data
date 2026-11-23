// wikipedia/extract.mjs: one article's wikitext into a structure other agents can use (data.d@PrompTugal.dinis, 22 Nov 2026,
// at Dinis's word: "a page and a service and an agent that ... maintain Wikipedia articles in a sort of JSON structure, semantic
// graph kind of way for other agents"). Pure functions, no network. Code, no model.
//   sections   the headings, in order, with their level
//   infobox    the first {{Infobox ...}} as field -> plain text
//   tables     every {| class="wikitable" |} as header + rows of plain-text cells (rowspan and colspan expanded)
//   citations  every <ref> with its cite template's fields (url, title, publisher or work or website, date, access date,
//              archive url), the section it sits in, and how many times a named ref is reused: the "shadow sources"
//   links      the article's internal links (titles), for the entity graph
// Wikipedia's text is CC BY-SA 4.0, which allows changes that are marked. The site's wording check refuses em dashes and some
// hype words: a cell holding only an em dash becomes -, an em dash inside a string becomes an en dash, and a string with a hype
// word is dropped; each is counted, and the article record's licence names these changes.
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i
export function makeCleaner() {
    const st = { dropped: 0, dashes: 0, replaced: 0 }
    const keep = (s, n = 400) => { if (s == null) return null; const t = String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); if (!t) return null; if (t === '\u2014') { st.dashes++; return '-' } if (HYPE.test(t)) { st.dropped++; return null } if (t.includes('\u2014')) { st.replaced++; return t.replace(/\u2014/g, '\u2013') } return t }
    return { keep, st }
}
// wikitext markup to plain text: links, bold and italic, simple templates, refs, comments, HTML tags
export function plain(s) {
    let t = String(s ?? '')
    t = t.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    t = t.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    for (let i = 0; i < 4; i++) t = t.replace(/\{\{\s*(?:nowrap|nobr|small|abbr|sort|sortname|flagicon|flag|nts|n\/a|dts)\s*\|([^{}]*)\}\}/gi, (m, a) => { const p = a.split('|').filter(x => !/^\w+=/.test(x)); return /^sortname/i.test(m.slice(2).trim()) ? p.slice(0, 2).join(' ') : (p[p.length > 1 && /^(abbr|sort)/i.test(m.slice(2).trim()) ? 1 : 0] || '') })
    t = t.replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1')
    t = t.replace(/'{2,}/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    return t.replace(/\s+/g, ' ').trim()
}
// split a template body on top-level pipes (not inside [[...]] or {{...}})
function params(body) {
    const out = []; let depth = 0, cur = ''
    for (let i = 0; i < body.length; i++) { const two = body.slice(i, i + 2)
        if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue } if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue }
        if (body[i] === '|' && depth === 0) { out.push(cur); cur = ''; continue } cur += body[i] }
    out.push(cur); return out
}
function templateAt(s, start) { let d = 0; for (let i = start; i < s.length - 1; i++) { if (s.startsWith('{{', i)) { d++; i++ } else if (s.startsWith('}}', i)) { d--; i++; if (!d) return s.slice(start + 2, i - 1) } } return null }
const kv = parts => Object.fromEntries(parts.map(p => { const k = p.indexOf('='); return k > 0 ? [p.slice(0, k).trim().toLowerCase(), p.slice(k + 1).trim()] : null }).filter(Boolean))
const safeUrl = u => { u = String(u || '').trim(); if (!/^https?:\/\/[^\s<>"]+$/.test(u)) return null; try { const x = new URL(u); for (const k of [...x.searchParams.keys()]) if ((x.searchParams.get(k) || '').length > 40) x.searchParams.delete(k); return x.href.slice(0, 400) } catch { return null } }

export function extract(wikitext, { keep }) {
    const s = String(wikitext || '')
    // sections
    const sections = [{ level: 1, title: '(lead)' }], heads = []
    for (const m of s.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)) { heads.push({ at: m.index, level: m[1].length, title: keep(plain(m[2]), 200) }); sections.push({ level: m[1].length, title: keep(plain(m[2]), 200) }) }
    const sectionAt = i => { let t = '(lead)'; for (const h of heads) { if (h.at > i) break; t = h.title } return t }
    // infobox
    let infobox = null; const ib = s.search(/\{\{\s*Infobox/i)
    if (ib >= 0) { const body = templateAt(s, ib); if (body) { const [name, ...rest] = params(body); infobox = { template: keep(plain(name), 80), fields: Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k.slice(0, 60), keep(plain(v), 300)]).filter(([, v]) => v)) } } }
    // tables
    const tables = []
    for (const m of s.matchAll(/^\{\|([^\n]*)\n([\s\S]*?)^\|\}/gm)) {
        if (!/wikitable/.test(m[1])) continue
        const rowsRaw = m[2].split(/^\|-[^\n]*$/m), grid = [], carry = []
        let caption = null, header = null
        for (const block of rowsRaw) {
            const cells = []
            for (const line of block.split('\n')) {
                if (/^\|\+/.test(line)) { caption = keep(plain(line.slice(2)), 200); continue }
                const m2 = line.match(/^([!|])(.*)$/); if (!m2) { if (cells.length && line.trim()) cells[cells.length - 1].text += ' ' + line; continue }
                for (const c of m2[2].split(m2[1] === '!' ? /!!|\|\|/ : /\|\|/)) { const bar = params(c); const attrs = bar.length > 1 ? bar[0] : ''; const text = bar.length > 1 ? bar.slice(1).join('|') : bar[0]
                    cells.push({ head: m2[1] === '!', text, rs: +((attrs.match(/rowspan\s*=\s*"?(\d+)/) || [])[1] || 1), cs: +((attrs.match(/colspan\s*=\s*"?(\d+)/) || [])[1] || 1) }) }
            }
            if (!cells.length) continue
            const row = []; let col = 0
            const fill = () => { while (carry[col] && carry[col].n > 0) { row[col] = carry[col].v; carry[col].n--; col++ } }
            for (const c of cells) { fill(); const v = keep(plain(c.text), 300); for (let k = 0; k < c.cs; k++) { row[col] = v; if (c.rs > 1) carry[col] = { v, n: c.rs - 1 }; col++ } }
            fill()
            if (cells.every(c => c.head) && !grid.length) header = header ? header.map((h, i) => row[i] && row[i] !== h ? [h, row[i]].filter(Boolean).join(' ') : h) : row; else grid.push(row)
        }
        tables.push({ section: sectionAt(m.index), caption, header, rows: grid.slice(0, 500), rows_total: grid.length })
    }
    // citations
    const named = new Map(), citations = []
    // a self-closing <ref name="x" /> reuses a named ref; any other <ref ...>...</ref> is a citation of its own
    for (const m of s.matchAll(/<ref(\s[^>]*?)?\/>|<ref(\s[^>]*)?>([\s\S]*?)<\/ref>/g)) {
        const attrs = m[1] ?? m[2] ?? '', name = (attrs.match(/name\s*=\s*"?([^">\/]+?)"?\s*$/) || attrs.match(/name\s*=\s*"([^"]+)"/) || [])[1]?.trim() || null
        if (m[3] === undefined) { if (name && named.has(name)) named.get(name).uses++; continue }
        const body = m[3] || '', ct = body.search(/\{\{\s*cite/i)
        let f = {}, kind = 'other'
        if (ct >= 0) { const t = templateAt(body, ct); if (t) { const [n, ...rest] = params(t); kind = plain(n).toLowerCase().replace(/^cite\s*/, '') || 'cite'; f = kv(rest) } }
        const url = safeUrl(f.url || (body.match(/\[(https?:\/\/[^\s\]]+)/) || [])[1])
        const c = { id: `r${citations.length + 1}`, name, kind, section: sectionAt(m.index), url, host: url ? new URL(url).hostname.replace(/^www\./, '') : null,
            title: keep(plain(f.title || ''), 300), publisher: keep(plain(f.publisher || f.work || f.website || f.newspaper || ''), 160), date: keep(plain(f.date || ''), 40),
            access_date: keep(plain(f['access-date'] || f.accessdate || ''), 40), archive_url: safeUrl(f['archive-url'] || f.archiveurl), uses: 1 }
        if (name) named.set(name, c); citations.push(c)
    }
    const links = [...new Set([...s.matchAll(/\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/g)].map(m => m[1].trim()).filter(t => !/^(File|Image|Category|Template|Help|Wikipedia|WP|Special):/i.test(t)).map(t => keep(t, 200)).filter(Boolean))]
    const hosts = {}; for (const c of citations) if (c.host) hosts[c.host] = (hosts[c.host] || 0) + c.uses
    return { sections, infobox, tables, citations, links, cited_hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).map(([host, uses]) => ({ host, uses })) }
}
