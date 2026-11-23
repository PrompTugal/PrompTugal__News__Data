// A test of wikipedia/extract.mjs on a sample written for it (not Wikipedia text). Run: node wikipedia/test-extract.mjs
import assert from 'node:assert/strict'
import { extract, makeCleaner, plain } from './extract.mjs'
const sample = `{{Infobox television season
| name = Test Show series 9
| network = [[BBC One]]
| first_aired = {{start date|2031|9|1}}
}}
'''Test Show series 9''' was a series.<ref name="a">{{cite web |url=https://example.org/news/1?utm=${"x".repeat(45)} |title=Launch |publisher=Example News |date=1 May 2031 |access-date=2 May 2031}}</ref>
==Couples==
{| class="wikitable"
|+ The couples
! Celebrity !! Known for !! Result
|-
| rowspan="2" | [[Ann Example]] || Actor || Winner<ref name="a" />
|-
| Singer || Second
|}
==Scores==
Text.<ref>{{cite news |url=https://news.example.com/x |title=Week one — scores |work=Example Times}}</ref><ref>[https://other.example.net/p A page]</ref>
[[Category:Test]] [[Ann Example|Ann]] [[File:x.png]]`
const { keep, st } = makeCleaner(), r = extract(sample, { keep })
assert.equal(r.infobox.template, 'Infobox television season'); assert.equal(r.infobox.fields.network, 'BBC One')
assert.deepEqual(r.sections.map(x => x.title), ['(lead)', 'Couples', 'Scores'])
assert.equal(r.tables.length, 1); assert.deepEqual(r.tables[0].header, ['Celebrity', 'Known for', 'Result'])
assert.deepEqual(r.tables[0].rows, [['Ann Example', 'Actor', 'Winner'], ['Ann Example', 'Singer', 'Second']]); assert.equal(r.tables[0].caption, 'The couples')
assert.equal(r.citations.length, 3); assert.equal(r.citations[0].uses, 2); assert.equal(r.citations[0].publisher, 'Example News')
assert.equal(r.citations[0].url, 'https://example.org/news/1'); assert.equal(r.citations[1].title, 'Week one \u2013 scores'); assert.equal(st.replaced, 1)   // the em dash becomes an en dash, counted
assert.equal(r.citations[2].host, 'other.example.net'); assert.deepEqual(r.links, ['BBC One', 'Ann Example'])
assert.deepEqual(r.cited_hosts[0], { host: 'example.org', uses: 2 }); assert.equal(plain("[[a|b]] '''c'''"), 'b c')
// a two-row header joins; a link inside {{small|...}} keeps its text; a lone dash cell keeps its meaning
{ const c = makeCleaner(), x = extract(`{| class="wikitable"\n! Couple !! Week !! Week\n|-\n! !! 1 !! 2\n|-\n| A ({{small|[[Place, Town|Place]]}}) || \u2014 || 30\n|}`, c)
  assert.deepEqual(x.tables[0].header, ['Couple', 'Week 1', 'Week 2']); assert.deepEqual(x.tables[0].rows, [['A (Place)', '-', '30']]); assert.equal(c.st.dashes, 1) }
console.log('extract: all checks pass')
